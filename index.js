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
  if(d > 1) {
    type += "v"
  }
  var setter = new Function("gl", "prog", "v", "gl.uniform" + d + type + "(gl.getUniformLocation(prog,'"+name+"'), v)")
  var getter = new Function("gl", "prog", "return gl.getUniform(prog, gl.getUniformLocation(prog,'"+name+"'))")
  Object.defineProperty(obj, name, {
    set: setter.bind(undefined, gl, prog),
    get: getter.bind(undefined, gl, prog),
    enumerable: true
  })
}

function makeMatrixUniform(gl, prog, location, obj, d, name) {
  var setter = new Function("gl", "prog", "v", "gl.uniformMatrix" + d + "fv(gl.getUniformLocation(prog,'"+name+"'), false, v)")
  var getter = new Function("gl", "prog", "return gl.getUniform(prog, gl.getUniformLocation(prog,'"+name+"'))")
  Object.defineProperty(obj, name, {
    set: setter.bind(undefined, gl, prog),
    get: getter.bind(undefined, gl, prog),
    enumerable: true
  })
}

function makeVectorAttrib(gl, prog, location, obj, d, name) {
  var out = {}
  out.pointer = function attribPointer(type, normalized, stride, offset) {
    gl.vertexAttribPointer(location, d, type||gl.FLOAT, normalized?gl.TRUE:gl.FALSE, stride||0, offset||0)
  }
  out.enable = function enableAttrib() {
    gl.enableVertexAttribArray(location)
  }
  out.disable = function disableAttrib() {
    gl.disableVertexAttribArray(location)
  }
  Object.defineProperty(out, "location", {
    get: function() {
      return location
    },
    set: function(v) {
      if(v !== location) {
        location = v
        gl.bindAttribLocation(prog, v, name)
        gl.linkProgram(prog)
      }
      return v
    }
  })
  var constFuncArgs = [ "gl", "v" ]
  var var_names = []
  for(var i=0; i<d; ++i) {
    constFuncArgs.push("x"+i)
    var_names.push("x"+i)
  }
  constFuncArgs.push([
    "if(x0.length === undefined) {",
      "return gl.vertexAttrib"+d+"f(v," + var_names.join(",") + ")",
    "} else {",
      "return gl.vertexAttrib" + d + "fv(v,x0)",
    "}"
  ].join("\n"))
  var constFunc = Function.apply(undefined, constFuncArgs)
  out.set = function setAttrib(x, y, z, w) {
    return constFunc(gl, location, x, y, z, w)
  }
  Object.defineProperty(obj, name, {
    set: function(x) {
      out.isArray = false
      constFunc(gl, location, x)
      return x
    },
    get: function() {
      return out
    },
    enumerable: true
  })
}

function makeShader(gl, vert_source, frag_source) {
  var vert_shader = gl.createShader(gl.VERTEX_SHADER)
  gl.shaderSource(vert_shader, vert_source)
  gl.compileShader(vert_shader)
  if(!gl.getShaderParameter(vert_shader, gl.COMPILE_STATUS)) {
    throw new Error("Error compiling vertex shader: " + gl.getShaderInfoLog(vert_shader))
  }
  
  var frag_shader = gl.createShader(gl.FRAGMENT_SHADER)
  gl.shaderSource(frag_shader, frag_source)
  gl.compileShader(frag_shader)
  if(!gl.getShaderParameter(frag_shader, gl.COMPILE_STATUS)) {
    throw new Error("Error compiling fragment shader: " + gl.getShaderInfoLog(frag_shader))
  }
  
  var program = gl.createProgram()
  gl.attachShader(program, frag_shader)
  gl.attachShader(program, vert_shader)
  gl.linkProgram(program)
  if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error("Error linking shader program: " + gl.getProgramInfoLog (program))
  }
  
  var frag_exports = glslExports(frag_source)
  var vert_exports = glslExports(vert_source)
  
  //Bind uniforms
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
      
        if(type.indexOf("vec") >= 0) {
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
              makeVectorUniform(gl, program, x, uniform_fields, "f", d, name)
            break
            
            default:
              throw new Error("Unrecognized data type")
          }
        } else if(type.charAt(0) === "m") {
          var d = type.charCodeAt(type.length-1) - 48
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
  
  //Bind attributes
  var attributes = kvPairs(vert_exports.attributes)
  var attribute_fields = {}
  for(var i=0; i<attributes.length; ++i) {
    var u = attributes[i]
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
        if(type.indexOf("vec") >= 0) {
          var d = type.charCodeAt(type.length-1) - 48
          if(d < 2 || d > 4) {
            throw new Error("Invalid data type")
          }
          makeVectorAttrib(gl, program, x, attribute_fields, d, name)
        } else {
          throw new Error("Invalid data type")
        }
      break
    }
  }
  
  return new Shader(gl, program, uniform_fields, attribute_fields)
}

module.exports = makeShader
