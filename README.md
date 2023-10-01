# flower
Flower is actually Flow-er

It is a tool to convert code in the Flower DSL into SVG graphics

The basic concept is what are called "Flows" which are nothing but a pair of "begin" and "end" states.
In the simplest example, these states would be co-ordinates of points 

A "flow" is the conceptual continous transformation from the "begin" to "end" state.
Since states are basically numeric, they can be interpolated over the normalized range 0 to 1 where 0 is the start and 1 is the end

This representation allows some things to be done easily:
- Animation is merely rendering the state in a flow between t = 0 and t = 1
- You can inherit and modify an existing flow to make a new one easily
- The starting and ending states could have different numbers of points (TODO)
- There could be things other than co-ordinates as a state if you provide the semantics of continuity between any 2 (TODO)
- Flows state could be linked to other flows states allowing complex animation possibilities

The DSL is a series of lines with RPN expressions
 - Anything in lowercase is an identifier
 - Anything starting with non-lowercase is a Type constructor or Operator
 - Points are in polar form
 - / means add to the points angle
 - \+ and - mean change the points distance
 - \* means scale the points distance


The "compiler" takes the DSL file and will (eventually) generate an SVG file that draws a flow with basic animation if desired.
For more complex graphics JS code will be added in the output (TODO).

Syntax is evolving, code is incomplete - look at the sample file(s) for elaborate syntax description (TODO).
 
 

 
