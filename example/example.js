var shell = require("gl-now")()
var makeShader = require("../index.js")
var shader
var buffer

shell.on("gl-init", function() {
  var gl = shell.gl

  //Create shader
  shader = makeShader(gl,
    "attribute vec3 position;\
    attribute vec3 color;\
    varying vec3 fcolor;\
    void main() {\
      gl_Position = vec4(position, 1.0);\
      fcolor = color;\
    }",
    "precision highp float;\
    uniform vec2 tp;\
    varying vec3 fcolor;\
    void main() {\
      gl_FragColor = vec4(fcolor * 0.5*(cos(tp.x)+1.0), 1.0);\
    }")

  //Create vertex buffer
  buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, 0, 0,
    0, -1, 0,
    1, 1, 0
  ]), gl.STATIC_DRAW)
})

shell.on("gl-render", function(t) {
  var gl = shell.gl

  //Bind shader
  shader.bind()
  
  //Set attributes
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  shader.attributes.position.pointer()
  shader.attributes.position.enable()
  shader.attributes.color = [1, 0, 1]

  //Set uniforms
  shader.uniforms.tp = [Date.now(), 10]

  //Draw
  gl.drawArrays(gl.TRIANGLES, 0, 3)
})