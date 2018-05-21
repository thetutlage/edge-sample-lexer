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
const MustacheStatement = require('../build/MustacheStatement')

test.group('Mustache Statement', () => {
  test('collect expression inside mustache braces', (assert) => {
    const statement = new MustacheStatement(1)
    statement.feed('{{ 2 + 2 }}')

    assert.isTrue(statement.started)
    assert.isTrue(statement.ended)
    assert.deepEqual(statement.props, {
      name: 'mustache',
      textLeft: '',
      textRight: '',
      jsArg: ' 2 + 2 ',
      position: { start: 1, end: 1 },
      jsArgOffset: 0
    })
  })

  test('collect expression inside mustache braces with text on left', (assert) => {
    const statement = new MustacheStatement(1)
    statement.feed('The value is {{ 2 + 2 }}')

    assert.isTrue(statement.started)
    assert.isTrue(statement.ended)
    assert.deepEqual(statement.props, {
      name: 'mustache',
      textLeft: 'The value is ',
      textRight: '',
      jsArg: ' 2 + 2 ',
      position: { start: 1, end: 1 },
      jsArgOffset: 0
    })
  })

  test('collect expression inside mustache braces with text on left and right', (assert) => {
    const statement = new MustacheStatement(1)
    statement.feed('The value is {{ 2 + 2 }}. This is called addition')

    assert.isTrue(statement.started)
    assert.isTrue(statement.ended)
    assert.deepEqual(statement.props, {
      name: 'mustache',
      textLeft: 'The value is ',
      textRight: '. This is called addition',
      jsArg: ' 2 + 2 ',
      position: { start: 1, end: 1 },
      jsArgOffset: 0
    })
  })

  test('collect expression inside mustache when in multiple lines', (assert) => {
    const statement = new MustacheStatement(1)
    const template = dedent`
    The users are {{
      users.map((user) => {
        return user.username
      }).join(',')
    }}
    `

    template.split('\n').forEach((line) => statement.feed(line))

    assert.isTrue(statement.started)
    assert.isTrue(statement.ended)
    assert.deepEqual(statement.props, {
      name: 'mustache',
      textLeft: 'The users are ',
      textRight: '',
      jsArg: '  users.map((user) => {    return user.username  }).join(\',\')',
      position: { start: 1, end: 5 },
      jsArgOffset: 0
    })
  })

  test('work fine when there are redundant braces', (assert) => {
    const statement = new MustacheStatement(1)
    const template = dedent`
    The users are {{
      users.map((user) => {
        return user.username
      }).join(',')
    }}}
    `

    template.split('\n').forEach((line) => statement.feed(line))

    assert.isTrue(statement.started)
    assert.isTrue(statement.ended)
    assert.deepEqual(statement.props, {
      name: 'mustache',
      textLeft: 'The users are ',
      textRight: '}',
      jsArg: '  users.map((user) => {    return user.username  }).join(\',\')',
      position: { start: 1, end: 5 },
      jsArgOffset: 0
    })
  })

  test('allow 3 braces for unescaped content', (assert) => {
    const statement = new MustacheStatement(1)
    statement.feed(`Welcome {{{ '<span> user </span>' }}}`)

    assert.isTrue(statement.started)
    assert.isTrue(statement.ended)
    assert.deepEqual(statement.props, {
      name: 'emustache',
      textLeft: 'Welcome ',
      textRight: '',
      jsArg: ' \'<span> user </span>\' ',
      position: { start: 1, end: 1 },
      jsArgOffset: 0
    })
  })

  test('do not close when didn\'t started', (assert) => {
    const statement = new MustacheStatement(1)
    statement.feed(`Welcome dude }}}`)

    assert.isFalse(statement.started)
    assert.isFalse(statement.ended)
    assert.deepEqual(statement.props, {
      name: '',
      textLeft: 'Welcome dude }}}',
      textRight: '',
      jsArg: '',
      position: { start: 1, end: 1 },
      jsArgOffset: 0
    })
  })

  test('multiple mustache should be parsed as raw string', (assert) => {
    const statement = new MustacheStatement(1)
    statement.feed(`Welcome {{ {{ username }} }}`)

    assert.isTrue(statement.started)
    assert.isTrue(statement.ended)
    assert.isFalse(statement.seeking)

    assert.deepEqual(statement.props, {
      name: 'mustache',
      textLeft: 'Welcome ',
      textRight: '',
      jsArg: ' {{ username }} ',
      position: { start: 1, end: 1 },
      jsArgOffset: 0
    })
  })

  test('mixing emustache and mustache make statement to keep to seeking', (assert) => {
    const statement = new MustacheStatement(1)
    statement.feed(`Welcome {{{ username }}`)

    assert.isTrue(statement.started)
    assert.isFalse(statement.ended)
    assert.isTrue(statement.seeking)

    assert.deepEqual(statement.props, {
      name: 'emustache',
      textLeft: 'Welcome ',
      textRight: '',
      jsArg: ' username }}',
      position: { start: 1, end: 1 },
      jsArgOffset: 0
    })
  })
})
