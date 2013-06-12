"use strict"

var glslExports = require("glsl-exports")
var uniq = require("uniq")

function Shader(gl, prog, uniforms, attributes) {
  this.gl = gl
  this.program = prog
  this.uniforms = uniforms
  this.attributes = attributes
}

Shader.prototype.bind = function() {
  this.gl.useProgram(this.program)
}

function kvPairs(obj) {
  return Object.keys(obj).map(function(x) { return [x, obj[x]] })
}

function makeVectorUniform(gl, prog, location, obj, type, d, name) {
  var setter = new Function("gl", "loc", "v", "gl.uniform" + d + type + "(loc, v)")
  var getter = new Function("gl", "prog", "loc", "return gl.getUniform(prog, loc)")
  Object.defineProperty(obj, name, {
    set: setter.bind(undefined, gl, location),
    get: getter.bind(undefined, gl, prog, location)
  })
}

function makeMatrixUniform(gl, prog, location, obj, d, name) {
  var setter = new Function("gl", "loc", "v", "gl.uniform" + d + type + "(loc, v)")
  var getter = new Function("gl", "prog", "loc", "return gl.getUniform(prog, loc)")
  Object.defineProperty(obj, name, {
    set: setter.bind(undefined, gl, location),
    get: getter.bind(undefined, gl, prog, location)
  })
}

function makeVectorAttrib(gl, prog, location, obj, d, name) {
}

function makeShader(gl, frag_source, vert_source) {
  var frag_shader = gl.createShader(gl.FRAG_SHADER)
  gl.shaderSource(frag_shader, frag_source)
  gl.compileShader(frag_shader)
  if(!gl.getShaderParameter(frag_shader, gl.COMPILE_STATUS)) {
    throw new Error("Error compiling fragment shader: " + gl.getShaderInfoLog(frag_shader))
  }
  
  var vert_shader = gl.createShader(gl.VERT_SHADER)
  gl.shaderSource(vert_shader, vert_source)
  gl.compileShader(vert_shader)
  if(!gl.getShaderParameter(vert_shader, gl.COMPILE_STATUS)) {
    throw new Error("Error compiling vertex shader: " + gl.getShaderInfoLog(vert_shader))
  }
  
  var program = gl.createProgram()
  gl.attachShader(program, frag_shader)
  gl.attachShader(program, vert_shader)
  gl.linkProgram(program)
  if (!success) {
    throw new Error("Error linking shader program: " + gl.getProgramInfoLog (program))
  }
  
  var frag_exports = glslExports(frag_source)
  var vert_exports = glslExports(vert_source)
  
  var uniforms = uniq(
      kvPairs(frag_exports.uniforms)
        .concat(kvPairs(vert_exports.uniforms)),
      function compare(a,b) {
        return a[0] < b[0] ? -1 : (a[0] === b[0] ? 0 : 1)
      })
  
  var uniform_fields = {}
  for(var i=0; i<uniforms.length; ++i) {
    var u = uniforms[i]
    var name = u[0]
    var type = u[1]
    var x = gl.getUniformLocation(program, name)
    
    //For unbound uniforms just create a dummy property
    if(!x) {
      Object.defineProperty(uniform_fields, name, {
        get: function() { },
        set: function() { }
      })
      continue
    }
    
    switch(type) {
      case "bool":
      case "int":
      case "sampler2D":
      case "samplerCube":
        makeVectorUniform(gl, program, x, uniform_fields, "i", 1, name)
      break
      
      case "float":
        makeVectorUniform(gl, program, x, uniform_fields, "f", 1, name)
      break
      
      default:
      
        if(type.indexOf("vec") > 0) {
          var d = type.charCodeAt(type.length-1) - 48
          if(d < 2 || d > 4) {
            throw new Error("Invalid data type")
          }
          switch(type.charAt(0)) {
            case "b":
            case "i":
              makeVectorUniform(gl, program, x, uniform_fields, "i", d, name)
            break
            
            case "v":
              makeVectorUniform(gl, program, x, uniform_fields, "i", d, name)
            break
            
            default:
              throw new Error("Unrecognized data type")
          }
        } else if(type.charAt(0) === "m") {
          var d = type.charCodeAt(u.type.length-1) - 48
          if(d < 2 || d > 4) {
            throw new Error("Invalid data type")
          }
          makeMatrixUniform(gl, program, x, uniform_fields, d, name)
        } else {
          throw new Error("Invalid data type")
        }
      break
    }
  }
  
  //Construct attributes
  var attributes = kvPairs(vert_exports.attributes)
  var attribute_fields = {}
  
  for(var i=0; i<uniforms.length; ++i) {
    var u = uniforms[i]
    var name = u[0]
    var type = u[1]
    var x = gl.getAttribLocation(program, name)
    
    switch(type) {
      case "bool":
      case "int":
      case "float":
        makeVectorAttrib(gl, program, x, attribute_fields, 1, name)
      break
      
      default:
        if(type.indexOf("vec") > 0) {
          var d = type.charCodeAt(type.length-1) - 48
          if(d < 2 || d > 4) {
            throw new Error("Invalid data type")
          }
          makeVectorAttrib(gl, program, x, attrib_fields, d, name)
        } else {
          throw new Error("Invalid data type")
        }
      break
    }
  }
  
  return new Shader(gl, program, uniform_fields, attribute_fields)
}

module.exports = makeShader
