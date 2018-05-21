/**
 * @module Lexer
 */

 /**
* edge-lexer
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { EOL } from 'os'
import Statement =  require('../TagStatement')
import { Prop, Position, Node, NodeType } from '../Contracts'

const TAG_REGEX = /^(\\)?@(?:!)?(\w+)/

class Tokenizer {
  private tokens: Node[]
  private currentStatement: Statement
  private openedTags: Node[]
  private line: number

  constructor (private template: string, private tagsDef: object) {
    this.tokens = []
    this.currentStatement = null
    this.openedTags = []
    this.line = 0
  }

  /**
   * Returns the recently opened block tag. It is used
   * to feed children unless the tag gets closed
   *
   * @returns Node
   */
  get recentOpenedTag (): Node {
    return this.openedTags[this.openedTags.length - 1]
  }

  /**
   * Returns the tag defination when line matches the regex
   * of a tag.
   *
   * @param  {string} line
   *
   * @returns object
   */
  getTag (line: string): null | { block?: boolean, seekable?: boolean, escaped?: boolean } {
    const match = TAG_REGEX.exec(line.trim())
    if (!match) {
      return null
    }

    const tagName = match[2]
    if (!this.tagsDef[tagName]) {
      return null
    }

    if (match[1]) {
      return { escaped: true }
    }

    return this.tagsDef[tagName]
  }

  /**
   * Returns the node for a tag
   *
   * @param  {Prop} properties
   *
   * @returns Node
   */
  getTagNode (properties: Prop): Node {
    return {
      type: NodeType.TAG,
      properties,
      position: {
        start: properties.position.start,
        end: this.line
      },
      children: []
    }
  }

  /**
   * Returns the node for a raw string
   *
   * @param  {string} value
   *
   * @returns Node
   */
  getRawNode (value: string): Node {
    return {
      type: NodeType.RAW,
      value,
      position: {
        start: this.line,
        end: this.line
      },
      children: []
    }
  }


  /**
   * Returns a boolean, when line content is a closing
   * tag
   *
   * @param  {string} line
   *
   * @returns boolean
   */
  isClosingTag (line: string): boolean {
    const recentOpenedTag = this.recentOpenedTag
    return recentOpenedTag && `@end${recentOpenedTag.properties.name}` === line.trim()
  }

  /**
   * Returns a boolean, which tells whether the currentStatement is
   * seeking for more data or not. Since we allow multi line
   * statements, we need to wait for multiple lines to
   * processed until a statement gets over.
   *
   * @returns boolean
   */
  isStatementSeeking (): boolean {
    return this.currentStatement && this.currentStatement.seeking
  }

  /**
   * Returns a boolean, telling that there is an open statement, but
   * not seeking for any more content.
   *
   * @returns boolean
   */
  isStatementSeeked (): boolean {
    return this.currentStatement && !this.currentStatement.seeking
  }

  /**
   * Consumes a statement when it's not seeking for more
   * content. This is basically a start of a tag.
   *
   * @returns void
   */
  consumeStatement (): void {
    if (this.tagsDef[this.currentStatement.props.name].block) {
      this.openedTags.push(this.getTagNode(this.currentStatement.props))
    } else {
      this.consumeNode(this.getTagNode(this.currentStatement.props))
    }
    this.currentStatement = null
  }

  /**
   * Here we feed the line to the current statement
   * and check whether it needs more content or
   * not.
   *
   * @param  {string} line
   *
   * @returns void
   */
  feedLineAsStatement (line:string): void {
    this.currentStatement.feed(line.replace('@', ''))
    if (this.isStatementSeeked()) {
      this.consumeStatement()
    }
  }

  /**
   * Here we add the node to tokens or as children for
   * the recentOpenedTag (if one exists).
   *
   * @param  {Node} tag
   *
   * @returns void
   */
  consumeNode (tag: Node): void {
    const recentOpenedTag = this.recentOpenedTag
    recentOpenedTag ? recentOpenedTag.children.push(tag) : this.tokens.push(tag)
  }

  /**
   * Process one line at time
   *
   * @param  {string} line
   *
   * @returns void
   */
  processLine (line: string): void {
    this.line++

    /**
     * Line is a statement
     */
    if (this.isStatementSeeking()) {
      this.feedLineAsStatement(line)
      return
    }

    /**
     * Line is opening of a tag
     */
    const tag = this.getTag(line)
    if (tag && tag.escaped) {
      this.consumeNode(this.getRawNode(line.replace(/^\\/, '')))
      return
    }

    if (tag) {
      this.currentStatement = new Statement(this.line, tag.seekable)
      this.feedLineAsStatement(line)
      return
    }

    /**
     * Line is closing of a tag
     */
    if (this.isClosingTag(line)) {
      const tag = this.openedTags.pop()
      tag.position.end = this.line
      this.consumeNode(tag)
      return
    }

    /**
     * Line is a raw string
     */
    this.consumeNode(this.getRawNode(line))
  }

  /**
   * Parses the AST
   *
   * @returns void
   */
  parse (): void {
    const lines = this.template.split(EOL)

    while (lines.length) {
      this.processLine(lines.shift())
    }
  }
}

module.exports = Tokenizer
