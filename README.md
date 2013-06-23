gl-shader
=========
Simple wrapper for WebGL shaders

**WORK IN PROGRESS**

# Example

Try it out now in your browser:  [http://mikolalysenko.github.io/gl-shader/](http://mikolalysenko.github.io/gl-shader/)

```javascript
var shell = require("gl-now")()
var createShader = require("gl-shader")
var shader, buffer

shell.on("gl-init", function() {
  var gl = shell.gl

  //Create shader
  shader = createShader(gl,
    "attribute vec3 position;\
    varying vec2 uv;\
    void main() {\
      gl_Position = vec4(position, 1.0);\
      uv = position.xy;\
    }",
    "precision highp float;\
    uniform float t;\
    varying vec2 uv;\
    void main() {\
      gl_FragColor = vec4(0.5*(uv+1.0), 0.5*(cos(t)+1.0), 1.0);\
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

  //Set uniforms
  shader.uniforms.t += 0.01

  //Draw
  gl.drawArrays(gl.TRIANGLES, 0, 3)
})
```

Here is the result:

<img src="https://raw.github.com/mikolalysenko/gl-shader/master/screenshot.png">

# Install

    npm install gl-shader

# API

```javascript
var createShader = require("gl-shader")
```

### `var shader = createShader(gl, vert_src, frag_src)`
Creates a shader in the WebGL context with the given vertex and fragment shader sources.

* `gl` is the WebGL context to create the shader in
* `vert_src` is the vertex shader source
* `frag_src` is the fragment shader source

**Returns** A `GLShader` object which wraps a WebGL program

**Throws** If there are any errors when creating the shader.

### `shader.program`
A handle to the underlying WebGLProgram object that the shader wraps.

### `shader.bind()`
Binds the shader to the currently used program.  Essentially a shorthand for:

```javascript
gl.useProgram(shader.program)
```

## Uniforms
The uniforms for the shader program are parsed at compile time using [glsl-exports](https://github.com/mikolalysenko/glsl-exports) and packaged up as properties in the `shader.uniforms` object.  For example, to update a scalar uniform you can just assign to it:

```javascript
shader.uniforms.scalar = 1.0
```

While you can update vector uniforms by writing an array to them:

```javascript
shader.uniforms.vector = [1,0,1,0]
```

Matrix uniforms must have their arrays flattened first:

```javascript
shader.uniforms.matrix = [ 1, 0, 1, 0,
                           0, 1, 0, 0,
                           0, 0, 1, 1,
                           0, 0, 0, 1 ]
```

You can also read the value of uniform too if the underlying shader is currently bound.  For example,

```javascript
console.log(shader.uniforms.scalar)
console.log(shader.uniforms.vector)
console.log(shader.uniforms.matrix)
```

## Attributes

The basic idea behind the attribute interface is similar to that for uniforms, however because attributes can be either a constant value or get values from a vertex array they have a slightly more complicated interface.  All of the attributes are stored in the `shader.attributes` property.

### `attrib.set()`
For non-array attributes you can set the constant value to be broadcast across all vertices.  For example, to set the vertex color of a shader to a constant you could do:

```javascript
shader.attributes.color = [1, 0, 0, 1]
```

This internally uses [`gl.vertexAttribnf`](http://www.khronos.org/opengles/sdk/docs/man/xhtml/glVertexAttrib.xml).  You can also assign to the attribute by calling:

```javascript
shader.attributes.color.set(1, 0, 0, 1)

//Or:
shader.attributes.color.set([1, 0, 0, 1])
```

### `attrib.location`
This property accesses the location of the attribute.  You can assign/read from it to modify the location of the attribute.  For example, you can update the location by doing:

```javascript
attrib.location = 0
```

Or you can read the currently bound location back by just accessing it:

```javascript
console.log(attrib.location)
```

Internally, these methods just call [`gl.bindAttribLocation`](http://www.khronos.org/opengles/sdk/docs/man/xhtml/glBindAttribLocation.xml) and access the stored location.

### `attrib.pointer([type, normalized, stride, offset])`
A shortcut for `gl.vertexAttribPointer`.  See the [OpenGL man page for details on how this works](http://www.khronos.org/opengles/sdk/docs/man/xhtml/glVertexAttribPointer.xml).  The main difference here is that the WebGL context, size and index are known and so these parameters are bound.

* `type` is the type of the pointer (default `gl.FLOAT`)
* `normalized` specifies whether fixed-point data values should be normalized (`true`) or converted directly as fixed-point values (`false`) when they are accessed.  (Default `false`)
* `stride` the byte offset between consecutive generic vertex attributes.  (Default: `0`)
* `offset` offset of the first element of the array in bytes. (Default `0`)


### `attrib.enable()`
This [enables the vertex attribute pointer](http://www.khronos.org/opengles/sdk/docs/man/xhtml/glEnableVertexAttribArray.xml).  It is a short cut for:

```javascript
gl.enableVertexAttribArray(attrib.location)
```

### `attrib.disable()`
This [disables the vertex attribute pointer](http://www.khronos.org/opengles/sdk/docs/man/xhtml/glEnableVertexAttribArray.xml).  It is a short cut for:

```javascript
gl.disableVertexAttribArray(attrib.location)
```

## Credits
(c) 2013 Mikola Lysenko. MIT License
