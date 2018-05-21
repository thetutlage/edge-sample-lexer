# Edge lexer

Edge lexer detects tags from any markup language and converts into tokens. Later these tokens with a Javascript parser like `esprima` or `babylon` to complete a logical template engine ( this is what egde does ).

This guide covers the syntax and semantics of the Tags.

## What is a tag?
A tag is block of code, which is used to define behavior in any markup language. A tag can be block level tag or an inline tag.

Lexer doesn't define the behavior of the tag, it's job is to recognize it and then parse it into tokens.

**Block level**

```
Here is some text

@if(isLogged)
 Your token is 12345678
@endif
```

**Inline**

```
@include('some-file')
```

The difference between a block and inline tag is that, a block level tag can contain body and an inline tag never contains a body.

Let's see some more examples to understand the syntax properly.

#### Simple block level

```
@if(loggedIn)
@endif
```

#### Block level (with whitespace)
Edge lexer is whitespace tolerant.

```
@if (loggedIn)
@endif
```

#### Block level (self closing)
Optionally block level tags can self close themselves by adding `!` after the `@` symbol.

```
@!component('form.input')
```

#### Block level (multiple lines)
Edge also allows splitting tag statements into multiple lines.

```
@if(
  isLogged &&
  isAdmin
)

@endif
```

#### Simple inline

```
@include('partials.header')
```

#### Inline (with whitespace)
Just like `block` tags, inline tags can also have spaces.

```
@include ('partials.header')
```

#### Inline (multiple lines)

```
@include(
  'partials.header'
)
```

---

## Invalid Syntax

Above was the list of all the valid syntax to define/use a tag. Following is list of invalid syntax

#### Space after `@` [invalid]
You cannot have a space after the `@` symbol.

```
@ if()

@endif
```

#### Must be at beginning of the line [invalid]
Each tag statement must be in it's own line.

1. `@<tagname>` in it's own line.
2. `@end<tagname>` in it's own line too.

```
Hello @if(username)
  {{ username }}
@endif
``` 

Following is also invalid

```
@if(username) {{ username }}
@endif
```

Or

```
@if(username) {{ username }} @endif
```

## Tokens
Following is the structure of the lexer Tokens.

```js
{
  type: '<NodeType>',
  value: '<NodeValue>',
  properties: {},
  position: {
    start: 1,
    end: 2
  },
  children: []        // nested nodes
}
```

#### type
Type defines the type of the node. There are only 2 types of nodes.

1. **raw** - The line of code with just markup.
2. **tag** - The line(s) represents a tag.

#### value
The value will contain the raw text if type is `raw` and will be `undefined`, if type is `tag`.

#### properties
The properties contains a key/value pair of properties related to the tag.

```js
{
  properties: {
    name: 'if'   
    jsArg: '2 + 2 === 4'
  }
}
```

#### position
The position of the node in the raw code. Since Edge lexer deals with block level content only, there is no need to store `columns`.

Also line numbers are not based off `0` index.

```js
{
  position: {
    start: 1,
    end: 3
  }
}
```

#### children
Children will be an array of nested nodes.

## Examples
Let's see the output of couple of examples. We are using `HTML` as the markup language, however you are free to use any markup language.

```html
<h1> Page title </h1>

@if(username)
  <p> Welcome {{ username }} </p>
@endif
```

Output

```
[
  {
    type: 'raw',
    value: '<h1> Page title </h1>',
    position: {
      start: 1,
      end: 1
    }
  },
  {
    type: 'raw',
    value: '',
    position: {
      start: 2,
      end: 2
    }
  },
  {
    type: 'tag',
    properties: {
      name: 'if',
      jsArg: 'username'
    },
    position: {
      start: 3,
      end: 5
    },
    children: [
      {
        type: 'raw',
        value: '<p> Welcome {{ username }} </p>',
        position: {
          start: 4,
          end: 4
        }
      }
    ]
  }
]
```
