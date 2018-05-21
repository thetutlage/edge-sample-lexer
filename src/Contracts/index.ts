/**
 * @module Lexer
 */

interface Statement {
  started: boolean
  ended: boolean
  props: Prop
  feed (line:string): void
}


interface Position {
  start: number
  end: number
}

interface Prop {
  name: string
  jsArg: string,
  jsArgOffset: number
  position: Position
}

interface MustacheProp extends Prop {
  textLeft: string
  textRight: string
}

enum NodeType {
  TAG = 'tag',
  RAW = 'raw'
}

interface Node {
  type: NodeType
  value?: string
  properties?: Prop
  position: Position
  children: Node[]
}

export { Prop as Prop }
export { Position as Position }
export { Node as Node }
export { NodeType as NodeType }
export { Statement as Statement }
export { MustacheProp as MustacheProp }
