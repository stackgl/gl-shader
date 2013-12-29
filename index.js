"use strict"

var uniq = require("uniq")
var extract = require("glsl-extract")
var createShader = require("gl-shader-core")
var through = require("through")

module.exports = compileShader

//This is a horrible hack to make streams run synchronously
function getExports(source) {
  var exports
  var stream = through()
  var nextTick = process.nextTick
  var stack = []
  process.nextTick = function(f) {
    stack.push(f)
  }
  extract(stream)(function onExtractComplete(err, info) {
    if(err) {
      throw err
    }
    exports = info
  })
  stream.end(new Buffer(source, "utf-8"))
  for(var i=0; i<stack.length; ++i) {
    var f = stack[i]
    try {
      f()
    } catch(e) {
      console.error(e)
    }
  }
  process.nextTick = nextTick
  return exports
}

//Run glsl-extract on the shader source, and compile the result
function compileShader(gl, vertexSource, fragmentSource) {
  var vertexExports = getExports(vertexSource)
  var fragmentExports = getExports(fragmentSource)
  var uniforms = uniq(vertexExports.uniforms.concat(fragmentExports.uniforms))
  var attributes = vertexExports.attributes
  return createShader(gl, vertexSource, fragmentSource, uniforms, attributes)
}