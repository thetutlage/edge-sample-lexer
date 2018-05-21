// @ts-check

/**
* edge-lexer
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

const test = require('japa')
const dedent = require('dedent')
const Tokenizer = require('../dist/Tokenizer')

const tagsDef = {
  if: {
    block: true,
    seekable: true
  },
  else: {
    block: false,
    seekable: false
  },
  include: {
    block: false,
    seekable: true
  }
}

test.group('Tokenizer', () => {
  test('tokenize a template into tokens', (assert) => {
    const template = dedent`
    Hello

    @if(username)
    @endif
    `

    const tokenizer = new Tokenizer(template, tagsDef)
    tokenizer.parse()

    assert.deepEqual(tokenizer['tokens'], [
      {
        type: 'raw',
        value: 'Hello',
        position: { start: 1, end: 1 },
        children: []
      },
      {
        type: 'raw',
        value: '',
        position: { start: 2, end: 2 },
        children: []
      },
      {
        type: 'tag',
        properties: {
          name: 'if',
          jsArg: 'username',
          jsArgOffset: 3,
          position: { start: 3, end: 3 }
        },
        position: { start: 3, end: 4 },
        children: []
      }
    ])
  })

  test('add content inside tags as the tag children', (assert) => {
    const template = dedent`
    Hello

    @if(username)
      Hello {{ username }}
    @endif
    `

    const tokenizer = new Tokenizer(template, tagsDef)
    tokenizer.parse()

    assert.deepEqual(tokenizer['tokens'], [
      {
        type: 'raw',
        value: 'Hello',
        position: { start: 1, end: 1 },
        children: []
      },
      {
        type: 'raw',
        value: '',
        position: { start: 2, end: 2 },
        children: []
      },
      {
        type: 'tag',
        properties: {
          name: 'if',
          jsArg: 'username',
          jsArgOffset: 3,
          position: { start: 3, end: 3 }
        },
        position: { start: 3, end: 5 },
        children: [
          {
            type: 'raw',
            value: '  Hello {{ username }}',
            position: { start: 4, end: 4 },
            children: []
          }
        ]
      }
    ])
  })

  test('allow nested tags', (assert) => {
    const template = dedent`
    Hello

    @if(username)
      @if(username === 'virk')
        Hi {{ username }}
      @endif
    @endif
    `

    const tokenizer = new Tokenizer(template, tagsDef)
    tokenizer.parse()

    assert.deepEqual(tokenizer['tokens'], [
      {
        type: 'raw',
        value: 'Hello',
        position: { start: 1, end: 1 },
        children: []
      },
      {
        type: 'raw',
        value: '',
        position: { start: 2, end: 2 },
        children: []
      },
      {
        type: 'tag',
        properties: {
          name: 'if',
          jsArg: 'username',
          jsArgOffset: 3,
          position: { start: 3, end: 3 }
        },
        position: { start: 3, end: 7 },
        children: [
          {
            type: 'tag',
            properties: {
              name: 'if',
              jsArg: 'username === \'virk\'',
              jsArgOffset: 5,
              position: { start: 4, end: 4 },
            },
            position: { start: 4, end: 6 },
            children: [
              {
                type: 'raw',
                value: '    Hi {{ username }}',
                position: { start: 5, end: 5 },
                children: []
              }
            ]
          }
        ]
      }
    ])
  })

  test('parse when statement is in multiple lines', (assert) => {
    const template = dedent`
    Hello

    @if(
      username
    )
      Hello {{ username }}
    @endif
    `

    const tokenizer = new Tokenizer(template, tagsDef)
    tokenizer.parse()

    assert.deepEqual(tokenizer['tokens'], [
      {
        type: 'raw',
        value: 'Hello',
        position: { start: 1, end: 1 },
        children: []
      },
      {
        type: 'raw',
        value: '',
        position: { start: 2, end: 2 },
        children: []
      },
      {
        type: 'tag',
        properties: {
          name: 'if',
          jsArg: '  username',
          jsArgOffset: 3,
          position: { start: 3, end: 5 }
        },
        position: { start: 3, end: 7 },
        children: [
          {
            type: 'raw',
            value: '  Hello {{ username }}',
            position: { start: 6, end: 6 },
            children: []
          }
        ]
      }
    ])
  })

  test('parse when statement is in multiple lines and has internal parens too', (assert) => {
    const template = dedent`
    Hello

    @if((
      2 + 2) * 3 === 12
    )
      Answer is 12
    @endif
    `

    const tokenizer = new Tokenizer(template, tagsDef)
    tokenizer.parse()

    assert.deepEqual(tokenizer['tokens'], [
      {
        type: 'raw',
        value: 'Hello',
        position: { start: 1, end: 1 },
        children: []
      },
      {
        type: 'raw',
        value: '',
        position: { start: 2, end: 2 },
        children: []
      },
      {
        type: 'tag',
        properties: {
          name: 'if',
          jsArg: '(  2 + 2) * 3 === 12',
          jsArgOffset: 3,
          position: { start: 3, end: 5 }
        },
        position: { start: 3, end: 7 },
        children: [
          {
            type: 'raw',
            value: '  Answer is 12',
            position: { start: 6, end: 6 },
            children: []
          }
        ]
      }
    ])
  })

  test('parse inline tags', (assert) => {
    const template = dedent`
    @include('partials.user')
    `

    const tokenizer = new Tokenizer(template, tagsDef)
    tokenizer.parse()

    assert.deepEqual(tokenizer['tokens'], [
      {
        type: 'tag',
        properties: {
          name: 'include',
          jsArg: '\'partials.user\'',
          jsArgOffset: 8,
          position: { start: 1, end: 1 }
        },
        position: { start: 1, end: 1 },
        children: []
      }
    ])
  })

  test('parse inline tags which are not seekable', (assert) => {
    const template = dedent`
    @if(username)
      Hello {{ username }}
    @else
      Hello guest
    @endif
    `

    const tokenizer = new Tokenizer(template, tagsDef)
    tokenizer.parse()

    assert.deepEqual(tokenizer['tokens'], [
      {
        type: 'tag',
        properties: {
          name: 'if',
          jsArg: 'username',
          jsArgOffset: 3,
          position: { start: 1, end: 1 }
        },
        position: { start: 1, end: 5 },
        children: [
          {
            type: 'raw',
            value: '  Hello {{ username }}',
            position: { start: 2, end: 2 },
            children: []
          },
          {
            type: 'tag',
            properties: {
              name: 'else',
              jsArg: '',
              jsArgOffset: 4,
              position: { start: 3, end: 3 }
            },
            position: { start: 3, end: 3 },
            children: []
          },
          {
            type: 'raw',
            value: '  Hello guest',
            position: { start: 4, end: 4 },
            children: []
          }
        ]
      }
    ])
  })

  test('ignore tag when not registered', (assert) => {
    const template = dedent`
    @foo('hello world')
    `

    const tokenizer = new Tokenizer(template, tagsDef)
    tokenizer.parse()

    assert.deepEqual(tokenizer['tokens'], [
      {
        type: 'raw',
        value: '@foo(\'hello world\')',
        position: { start: 1, end: 1 },
        children: []
      }
    ])
  })

  test('ignore tag when escaped', (assert) => {
    const template = dedent`
    \@if(username)
    @endif
    `

    const tokenizer = new Tokenizer(template, tagsDef)
    tokenizer.parse()

    assert.deepEqual(tokenizer['tokens'], [
      {
        type: 'raw',
        value: '@if(username)',
        position: { start: 1, end: 1 },
        children: []
      },
      {
        type: 'raw',
        value: '@endif',
        position: { start: 2, end: 2 },
        children: []
      }
    ])
  })
})
