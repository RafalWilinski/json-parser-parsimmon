import P from "parsimmon";

type KeyValuePair = {
  key: string;
  value: unknown;
};

let Whitespace = P.regexp(/\s*/m);

function Token(parser: P.Parser<unknown>) {
  return parser.skip(Whitespace);
}

function Word(str: string) {
  return P.string(str).thru(Token);
}

/**
 * Takes a String and returns a JS Object
 * @param input stringified JSON
 */
const parse = (input: string) => {
  const createJSONLanguage = P.createLanguage({
    // Basic Tokens, Syntax Elements
    OpeningBracket: () => Word("{"),
    ClosingBracket: () => Word("}"),
    ArrayOpen: () => Word("["),
    ArrayClose: () => Word("]"),
    Comma: () => Word(","),
    Colon: () => Word(":"),

    // Primitive Types
    // Null, true and false does not work for some reason
    null: () => Word("null").desc("Null value").result(null),
    True: () => Word("true").desc("True (Boolean)").result(true),
    False: () => Word("false").desc("False (Boolean)").result(false),
    Number: () => P.digits.map(Number),
    String: (r) => Token(P.regexp(/"((?:\\.|.)*?)"/, 1)).desc("String"),

    // Value is an alternative of all possible types
    Value: (r) =>
      P.alt(
        r.Object,
        r.Array,
        r.String,
        r.Number,
        r.null,
        r.True,
        r.False
      ).thru((p) => Whitespace.then(p)),

    // Take array opening ([]), separate Values by comma, throw aray ending, trim whitespaces
    Array: (r) =>
      r.ArrayOpen.then(r.Value.sepBy(r.Comma))
        .skip(r.ArrayClose)
        .thru((p) => Whitespace.then(p)),

    // Pair of values - Key<string> and Value<value>
    KeyValuePair: (r) => P.seq(r.String.skip(r.Colon), r.Value),

    // Remove "{", separate everything by ',' and throw away "}"
    // Result: [["key", "value"], ["key", {"nested":"1"}]]
    // Reduce that into an object
    Object: (r) =>
      r.OpeningBracket.then(r.KeyValuePair.sepBy(r.Comma))
        .skip(r.ClosingBracket)
        .map((arrayOfKeyValuePairs) =>
          arrayOfKeyValuePairs.reduce((accum, keyValuePair) => {
            accum[keyValuePair[0]] = keyValuePair[1];
            return accum;
          }, {})
        )
        .desc(
          "An object/map starting with '{' and ending with '}' with contents inside"
        ),
  });

  return createJSONLanguage.Object.tryParse(input);
};

console.log(
  parse(
    '{    "key"   :   {"nested":"1"}  ,    "key3"   : 888, "Array":[1,"2", {}]}'
  )
);
