/**
* edge-lexer
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import * as WhitespaceRegex from 'whitespace-regex'
import { Prop, Position, Statement } from '../Contracts'

const whitespaceRegex = WhitespaceRegex()

const OPENING_BRACE = 40
const CLOSING_BRACE = 41

/**
 * @module Lexer
 */
class TagStatement implements Statement {
  started: boolean;
  ended: boolean;
  props: Prop

  private currentProp: string;
  private internalParens: number

  constructor (private startPosition: number, private seekable:boolean = true) {
    this.started = false
    this.ended = false

    this.props = {
      name: '',
      jsArg: '',
      jsArgOffset: 0,
      position: {
        start: this.startPosition,
        end: this.startPosition - 1
      }
    }

    this.currentProp = 'name'
    this.internalParens = 0
  }

  /**
   * Tells whether statement is seeking for more content
   * or not. When seeking is false, it means the
   * statement has been parsed successfully.
   *
   * @returns boolean
   */
  get seeking (): boolean {
    return !(this.started && this.ended)
  }

  /**
   * Tells whether character is a whitespace or not
   *
   * @param  {string} char
   *
   * @returns boolean
   */
  private isWhiteSpace (char: string): boolean {
    return whitespaceRegex.test(char)
  }

  /**
   * Returns a boolean telling if charcode should be considered
   * as the start of the statement.
   *
   * @param  {number} charcode
   *
   * @returns boolean
   */
  private isStartOfStatement (charcode: number): boolean {
    return charcode === OPENING_BRACE && this.currentProp === 'name'
  }

  /**
   * Returns a boolean telling if charCode should be considered
   * as the end of the statement
   *
   * @param  {number} charcode
   *
   * @returns boolean
   */
  private isEndOfStatement (charcode: number): boolean {
    return charcode === CLOSING_BRACE && this.internalParens === 0
  }

  /**
   * Starts the statement by switching the currentProp to
   * `jsArg` and setting the started flag to true.
   *
   * @returns void
   */
  private startStatement (): void {
    this.props.jsArgOffset++
    this.currentProp = 'jsArg'
    this.started = true
  }

  /**
   * Ends the statement by switching the ended flag to true. Also
   * if `started` flag was never switched on, then it will throw
   * an exception.
   *
   * @returns void
   */
  private endStatement (char: string): void {
    if (!this.started) {
      throw new Error(`Unexpected token ${char}. Wrap statement inside ()`)
    }
    this.ended = true
  }

  /**
   * Feeds character to the currentProp. Also this method will
   * record the toll of `opening` and `closing` parenthesis.
   *
   * @param  {string} char
   * @param  {number} charCode
   *
   * @returns void
   */
  private feedChar (char: string, charCode: number): void {
    if (this.currentProp === 'name') {
      this.props.jsArgOffset++
    }

    /**
     * Do not consume whitespace when currentProp is name
     */
    if (this.isWhiteSpace(char) && this.currentProp === 'name') {
      return
    }

    if (charCode === OPENING_BRACE) {
      this.internalParens++
    }

    if (charCode === CLOSING_BRACE) {
      this.internalParens--
    }

    this.props[this.currentProp] += char
  }

  /**
   * Throws exception when end of the statement is reached, but there
   * are more chars to be feeded. This can be because of unclosed
   * statement or following code is not in a new line.
   *
   * @param  {Array<string>} chars
   *
   * @returns void
   */
  private ensureNoMoreCharsToFeed (chars: Array<string>): void {
    if (chars.length) {
      throw new Error(`Unexpected token {${chars.join('')}}. Write in a new line`)
    }
  }

  /**
   * Feed a new line to be tokenized into a statement.
   * This method will collapse all whitespaces.
   *
   * @param  {string} line
   *
   * @returns void
   *
   * @example
   *
   * ```js
   * statement.feed('if(2 + 2 === 4)')
   *
   * statement.ended // true
   * statement.props.name // if
   * statement.props.jsArg // 2+2===4
   * ```
   */
  feed (line: string): void {
    if (this.ended) {
      throw new Error(`Unexpected token {${line}}. Write in a new line`)
    }

    this.props.position.end++

    if (!this.seekable) {
      this.props.name = line.trim()
      this.props.jsArgOffset = this.props.name.length
      this.ended = true
      this.started = true
      return
    }

    const chars = line.split('')

    while (chars.length) {
      const char: string = chars.shift()
      const charCode = char.charCodeAt(0)

      if (this.isStartOfStatement(charCode)) {
        this.startStatement()
      } else if (this.isEndOfStatement(charCode)) {
        this.ensureNoMoreCharsToFeed(chars)
        this.endStatement(char)
        break
      } else {
        this.feedChar(char, charCode)
      }
    }
  }
}

export = TagStatement
