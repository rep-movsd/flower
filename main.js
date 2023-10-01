// Add python style index function to arrays
Object.defineProperty
(
  Array.prototype,
  "sub",
  {
    value: function start(start, end)
    {
      return this.slice(start < 0 ? start + this.length : start, end < 0 ? end + this.length : end);
    }
  }
);

// Add python style index function to arrays
Object.defineProperty
(
  Array.prototype,
  "at",
  {
    value: function at(idx)
    {
      return this[idx < 0 ? idx + this.length : idx];
    }
  }
);

const Tokens =
{
  ID: 'ID',
  OP:  'OP',
  BEG: 'BEG',
  END: 'END',
  NUM: 'NUM',
}

// Represents a typed variable
class Var
{
  type = null;
  val = null;
  clone = null;
}

class Num extends Var
{
  constructor(val)
  {
    super();
    this.val = val;
    this.type = 'Num';
    this.clone = () => new Num(this.val);
  }
}

class Point extends Var
{
  constructor(dist, angle)
  {
    super();
    this.val = {r: dist || 0.0, th: angle || 0.0};
    this.type = 'Point';
    this.clone = () => new Point(this.val.r, this.val.th);
  }

  plus = (num) => new Point(this.val.r + num, this.val.th);
  minus = (num) => new Point(this.val.r - num, this.val.th);
  divide = (num) => new Point(this.val.r, this.val.th += num);
  times = (num) => new Point(this.val.r * num, this.val.th);
}

class Arr extends Var
{
  constructor(arr)
  {
    super();
    this.val = arr;
    this.type = Types.Arr;
    this.clone = () => new Arr(this.val.map(v => v.clone()));
  }
}

class Dict extends Var
{
  constructor(dct)
  {
    super();
    this.val = dct;
    this.type = Types.Dict;
    this.clone = () =>
    {
      const dct = {};
      for(const key in this.val)
      {
        dct[key] = this.val[key].clone();
      }
      return new Dict(dct);
    }
  }
}

// Abstraction for an SVG element
class Canvas
{
  constructor(arrTokens)
  {
    this.props = {};
    while(arrTokens.length)
    {
      const name = arrTokens.pop();
      const val = arrTokens.pop();
      this.props[name.val] = val.val;
    }
  }

  draw = (arrTokens) =>
  {
    this.points = [];

    // Get the flow
    const sFlow = arrTokens.pop();
    const flow = dctFlows[sFlow.val];

    // Get the state var name
    const sStateVar = arrTokens.pop();
    const stateVar = flow.end.val[sStateVar.val];

    console.log('Drawing', sFlow.val, sStateVar.val, stateVar);
  }

  // Get the SVG string
  get = () =>
  {
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">';
    for(const elem of this.val)
    {
      s += elem.get();
    }
    s += '</svg>';
    return s;
  }

}



// A Flow object has two dicts of variables, one for the beginning of the flow, and one for the end
class Flow
{
  constructor()
  {
    // starting and ending states
    this.beg = new Dict({});
    this.end = new Dict({});
    this.name = null;

    // A dictionary of local variables while executing the flow
    this.locals = new Dict({});

    this.clone = () => {
      const flow = new Flow();
      flow.name = this.name;
      flow.beg = this.beg.clone();
      flow.end = this.end.clone();
      flow.locals = this.locals.clone();
      return flow;
    }

  }
}


const Types =
{
  // Type constants
  'Num': Num,
  'Point': Point,
  //'Line': Line,
  'Arr': Arr,
  'Flow': Flow,
  'Dict': Dict,
}


// Symbol table for flows
const dctFlows = {};

theCanvas = null;

// Current flow being parsed
let sCurrentFlow = null;

// Gets the dict where the given var is stored in the flow
function getVarDict(sVarName)
{
  const flow = dctFlows[sCurrentFlow];
  const isState = sVarName in flow.end.val;
  const isLocal = sVarName in flow.locals.val;

  if(isState && isLocal)
  {
    throw new Error('Variable is in both flow state and local scope');
  }

  return isState ? flow.end : flow.locals;
}



// Checks if val is of any type in arrTypes
expectVal = (val, typ) =>
{
  if(!(val instanceof typ))
    throw new Error(`Expected value of type ${typ.toString()}, got ${typeof val}`);
}

// Parses a flow declaration
function parseFlow(name, args)
{
  // First param of Flow is an identifier
  expect(name, [Tokens.ID]);

  const flow = new Flow();
  flow.name = name.val;

  // Second param is a dict of variables
  flow.beg = args.clone();
  flow.end = args.clone();
  dctFlows[flow.name] = flow;

  // Set the current flow
  sCurrentFlow = flow.name;

  return null;
}

// Parses [Num Type] or [ Type ]
function parseType(rest)
{
  // pop the type
  const type = rest.pop();
  expect(type, [Tokens.OP]);
  const ctor = Types[type.val];

  // Is there more?
  let num = 0;
  if(rest.length)
  {
    if(rest.at(-1).type === Tokens.NUM)
    {
      num = rest.pop().val;
    }
  }

  // If its num, make an Arr object, else make a single object
  if(num)
  {
    const arr = Array(num).fill(null).map(() => new ctor());
    return new Arr(arr);
  }
  else
  {
    return new ctor();
  }
}

// Evaluates one argument
function parseArg(rest)
{
  // Get the type (single or array)
  const type = parseType(rest);

  // Expect a name now
  const t = expect(rest.pop(), [Tokens.ID]);
  expect(t, [Tokens.ID]);

  return [t.val, type];
}

// Returns a Dict of args
function parseArgs(rest)
{
  // rest contains a list of args like
  // x T y 8 T and so on where T is a type and x is a variable name, and 8 is the array size for an array type

  // make an array of arg values
  const dctArgs = [];
  while(rest.length)
  {
    const arg = parseArg(rest);
    dctArgs[arg[0]] = arg[1];
  }

  return new Dict(dctArgs);
}

// Variable declaration
function parseDecl(rest)
{
  // Parse one argument
  const arg = parseArg(rest);

  // Add to the current flow locals
  const locals = dctFlows[sCurrentFlow].locals;
  locals.val[arg[0]] = arg[1];
}

// Assignment
function parseAssign(name, expr)
{
  // Get the RHS
  const val = parse(expr);

  // Get the LHS dict and assign
  const dct = getVarDict(name.val);
  dct.val[name.val] = val;
}

// Handle the Each loop expression
function parseEach(arrTokens)
{
  // Get the iterator name and remove it from the array
  const iter = expect(arrTokens.pop(), [Tokens.ID]);

  // Add a local variable to the current flow with the iterator name and initialized to 0
  const dct = dctFlows[sCurrentFlow].locals.val;
  dct[iter.val] = 0;

  // Get the iterator count
  const count = expect(arrTokens.pop(), [Tokens.NUM]);
  const vals = [];
  for(let i = 0; i < count.val; i++)
  {
    // Execute the remaining expression, making a copy
    const val = parse([...arrTokens]);
    vals.push(val);
    dct[iter.val]++;
  }

  return vals;
}

// Parse a binary operator
function parseOp(op, val1, val2)
{
  let ret;

  // If both are numbers do arithmetic
  if(typeof val1 === 'number' && typeof val2 === 'number')
  {
    switch(op.val)
    {
      case '+': ret = val1 + val2;  break;
      case '-': ret = val1 - val2;  break;
      case '*': ret = val1 * val2;  break;
      case '/': ret = val1 / val2;  break;
      case '%': ret = val1 % val2;  break;
      case '^': ret = val1 ** val2; break;
    }
  }

  // If its an object, call the op fn
  if(typeof val1 === 'object')
  {
    if(val1.constructor.name === 'Array')
    {
      switch(op.val)
      {
        case '+': ret = val1.map(v => v.plus(val2));  break;
        case '-': ret = val1.map(v => v.minus(val2));  break;
        case '*': ret = val1.map(v => v.times(val2));  break;
        case '/': ret = val1.map(v => v.divide(val2));  break;
      }
    }
    else
    {
      switch(op.val)
      {
        case '+': ret = val1.plus(val2);   break;
        case '-': ret = val1.minus(val2);  break;
        case '*': ret = val1.times(val2);  break;
        case '/': ret = val1.divide(val2); break;
      }
    }
  }
  return ret;
}

// Parse an arithmetic expression
function parseArith(arrTokens)
{
  // The first operand is the first element of the array
  const arg1 = arrTokens.shift();
  const type1 = arg1.type;

  let val1 = null;
  if(type1 === Tokens.ID)
  {
    // Get the variable from the current flow
    const dct = getVarDict(arg1.val);
    val1 = dct.val[arg1.val];
  }
  else if(type1 === Tokens.NUM)
  {
    val1 = arg1.val;
  }

  // If there is only one token return the val
  if(arrTokens.length === 0)
  {
    return val1;
  }

  // The operator is the last element of the array
  const op = arrTokens.pop();

  // The second operand is the remaining part of the array
  const val2 = parseArith(arrTokens);

  // At this point both operands are evaluated
  // Now we can evaluate the expression
  return parseOp(op, val1, val2);
}


// Parses a statement
function parse(arrTokens)
{
  // Expect an OP or close bracket at the end
  const op = expect(arrTokens.at(-1), [Tokens.OP, Tokens.END])

  switch(op.val)
  {
    case 'Flow':
    {
      arrTokens.pop();
      const name = arrTokens.shift();
      return parseFlow(name, parse(arrTokens));
    }

    case 'EndFlow':
    {
      sCurrentFlow = null;
      return;
    }

    case ')':
    {
      arrTokens.pop();
      expect(arrTokens.shift(), [Tokens.BEG])
      return parseArgs(arrTokens);
    }

    case 'Decl':
    {
      arrTokens.pop();
      return parseDecl(arrTokens);
    }

    case '=':
      arrTokens.pop();
      const name = arrTokens.shift();
      return parseAssign(name, arrTokens);

    case 'Each':
      arrTokens.pop();
      return parseEach(arrTokens);

    default:
      // No Pop
      return parseArith(arrTokens);
  }
}


function tokenize(line, num)
{
  // Remove comments at the end of the line
  line = line.split('#')[0].trim();

  // Ignore blank arrLines
  if(line === '')
  {
    return null;
  }

  const tokens = line.split(/\s+/); // Split by whitespace
  const result = [];

  for(const token of tokens)
  {
    if(token.match(/^[a-z]\w*$/))
    {
      // Variable (starts with a lowercase letter)
      result.push({type: Tokens.ID, val: token});
    }
    else if(token === '(')
    {
      // Bracket
      result.push({type: Tokens.BEG, val: token});
    }
    else if(token === ')')
    {
      // Bracket
      result.push({type: Tokens.END, val: token});
    }
    else if(token.match(/^[^a-z]\w*$/))
    {
      // Operator (starts with anything except lowercase letters)

      // Check for number with parseFloat
      if(!isNaN(parseFloat(token)))
      {
        result.push({type: Tokens.NUM, val: parseFloat(token)});
      }
      else
      {
        result.push({type: Tokens.OP, val: token});
      }
    }
    else
    {
      // Invalid token
      throw new Error(`Invalid token: ${token} at line ${num}`);
    }
  }

  return result;
}

// Returns a token, and removes it from the array, or throws an error if the token is not in the expected type list
function expect(token, arrTypes)
{
  if(arrTypes && !arrTypes.includes(token.type))
  {
    throw new Error(`Expected token of type ${arrTypes}, got ${token.type}`);
  }
  return token;
}

const fs = require('fs');


function start()
{
  const arrArgs = process.argv.slice(2);
  const arrStmtTokens = [];
  const arrLinesParsed = [];

  try
  {
    // Read the file synchronously
    const sFileContent = fs.readFileSync(arrArgs[0], 'utf-8');

    const arrLines = sFileContent.split('\n');
    let nLine = 1;
    for(const sLine of arrLines)
    {
      const arrTokens = tokenize(sLine, nLine);
      if(arrTokens)
      {
        arrStmtTokens.push(arrTokens);
        arrLinesParsed.push(sLine);
      }

      nLine++;
    }
  }
  catch(err)
  {
    console.error('Error reading file:', err);
  }

  ////console.log(arrStmtTokens[0]);
  for(let i = 0; i < 4; i++)
  {
    parse(arrStmtTokens[i]);
  }

  console.log('\n\nSymbol table:')
  console.log(dctFlows[sCurrentFlow]);
  console.log(JSON.stringify(dctFlows, null, 2));
  //console.log(dctFlows[sCurrentFlow].end.val.s.val);
  //console.log(dctFlows[sCurrentFlow].locals.val);



}





start();

