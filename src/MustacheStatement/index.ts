/**
* edge-lexer
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { Statement, MustacheProp } from '../Contracts'

const OPENING_BRACE = 123
const CLOSING_BRACE = 125

/**
 * @module Lexer
 */
class MustacheStatement implements Statement {
  public started: boolean
  public ended: boolean
  public props: MustacheProp
  private currentProp: string
  private internalBraces: number

  constructor (private startPosition: number) {
    this.started = false
    this.ended = false

    this.props = {
      name: '',
      jsArg: '',
      jsArgOffset: 0,
      textLeft: '',
      textRight: '',
      position: {
        start: this.startPosition,
        end: this.startPosition - 1
      }
    }

    this.internalBraces = 0
    this.currentProp = 'textLeft'
  }

  /**
   * Returns the name of the type of the mustache tag. If char and
   * surrounding chars, doesn't form an opening `{{` mustache
   * pattern, then `null` will be returned
   *
   *
   * @param  {string[]} chars
   * @param  {number} charCode
   *
   * @returns null
   */
  getName (chars: string[], charCode: number): null | string {
    if (charCode !== OPENING_BRACE || !chars.length) {
      return null
    }

    let next = chars[0].charCodeAt(0)

    /**
     * Will be considered as mustache, when consecutive chars
     * are {{
     */
    const isMustache = next === OPENING_BRACE
    if (!isMustache) {
      return null
    }

    chars.shift()
    if (!chars.length) {
      return 'mustache'
    }

    /**
     * Will be considered as `escaped mustache`, when consecutive
     * chars are {{{
     */

    next = chars[0].charCodeAt(0)
    const isEMustache = next === OPENING_BRACE
    if (!isEMustache) {
      return 'mustache'
    }

    chars.shift()
    return 'emustache'
  }

  /**
   * Returns a boolean telling whether the current char and surrounding
   * chars form the closing of mustache.
   *
   * @param  {string[]} chars
   * @param  {number} charCode
   *
   * @returns boolean
   */
  isClosing (chars: string[], charCode: number): boolean {
    if (charCode !== CLOSING_BRACE || this.internalBraces !== 0) {
      return false
    }

    /**
     * If opening statement was detected as `emustache`, then expect
     * 2 more consecutive chars as CLOSING_BRACE
     */
    if (this.props.name === 'emustache' && chars.length >= 2) {
      const next = chars[0].charCodeAt(0)
      const nextToNext = chars[1].charCodeAt(0)

      if (next === CLOSING_BRACE && nextToNext === CLOSING_BRACE) {
        chars.shift()
        chars.shift()
        return true
      }

      return false
    }

    /**
     * If opening statement was detected as `mustache`, then expect
     * 1 more consecutive char as CLOSING_BRACE
     */
    if (this.props.name === 'mustache' && chars.length >= 1) {
      const next = chars[0].charCodeAt(0)

      if (next === CLOSING_BRACE) {
        chars.shift()
        return true
      }

      return false
    }

    return false
  }

  /**
   * We are seeking for more content, when the found
   * opening braces but waiting for curly braces.
   *
   * @returns boolean
   */
  get seeking (): boolean {
    return this.started && !this.ended
  }

  /**
   * Process one char at a time
   *
   *
   * @param  {string[]} chars
   * @param  {string} char
   *
   * @returns void
   */
  processChar (chars: string[], char: string): void {
    let name = null
    const charCode = char.charCodeAt(0)

    /**
     * Only process name, when are not in inside mustache
     * statement.
     */
    if (!this.started) {
      name = this.getName(chars, charCode)
    }

    if (name) {
      this.props.name = name
      this.started = true
      this.currentProp = 'jsArg'
    } else if (this.started && !this.ended && this.isClosing(chars, charCode)) {
      this.currentProp = 'textRight'
      this.ended = true
    } else {
      if (charCode === OPENING_BRACE) {
        this.internalBraces++
      }

      if (charCode === CLOSING_BRACE) {
        this.internalBraces--
      }
      this.props[this.currentProp] += char
    }
  }

  /**
   * Feed a new line to be parsed as mustache. For performance it is recommended
   * to check that line contains alteast one `{{` statement and is not escaped.
   *
   * @param  {string} line
   *
   * @returns void
   */
  feed (line:string): void {
    if (this.ended) {
      throw new Error(`Unexpected token {${line}}`)
    }

    const chars = line.split('')
    this.props.position.end++

    while (chars.length) {
      const char = chars.shift()
      this.processChar(chars, char)
    }
  }
}

export = MustacheStatement
