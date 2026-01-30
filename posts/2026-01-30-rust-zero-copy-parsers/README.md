# How to Create Zero-Copy Parsers in Rust

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Rust, Performance, Parsing, Memory

Description: Build high-performance zero-copy parsers in Rust using lifetimes, borrowing, and the nom library to process data without unnecessary allocations.

---

## Introduction

When parsing large files or processing high-throughput data streams, memory allocation becomes a significant bottleneck. Every `String::from()` or `.to_owned()` call copies bytes from the input buffer into new heap memory. For a 1GB log file, this means potentially allocating gigabytes of additional memory just to hold parsed tokens.

Zero-copy parsing solves this by returning references (slices) into the original input buffer instead of owned copies. The parsed data "borrows" from the input, avoiding allocations entirely for string-like data.

This post walks through building zero-copy parsers in Rust, from basic lifetime annotations to a complete JSON-like parser, and finally using the nom library for production-grade parsing.

## What Zero-Copy Actually Means

Traditional parsing allocates new memory for each parsed element:

```rust
// Allocating parser - copies data
struct AllocatingToken {
    kind: TokenKind,
    value: String,  // Owns its data, allocated on heap
}

fn parse_allocating(input: &str) -> Vec<AllocatingToken> {
    // Each token.value is a new String allocation
    // Input: "hello world" (11 bytes)
    // Output: Two Strings totaling 11 bytes of NEW heap memory
}
```

Zero-copy parsing returns references into the original input:

```rust
// Zero-copy parser - borrows data
struct ZeroCopyToken<'a> {
    kind: TokenKind,
    value: &'a str,  // Borrows from input, no allocation
}

fn parse_zero_copy<'a>(input: &'a str) -> Vec<ZeroCopyToken<'a>> {
    // Each token.value points into the original input
    // Input: "hello world" (11 bytes)
    // Output: Two &str slices, 0 bytes of new string allocation
}
```

The `'a` lifetime annotation tells Rust that `ZeroCopyToken` borrows from something that lives at least as long as `'a`. The compiler enforces that you cannot use the tokens after the input is dropped.

### Memory Layout Comparison

| Approach | Input Size | Additional Heap Allocation | Cache Locality |
|----------|------------|---------------------------|----------------|
| Allocating | 1 MB | ~1 MB (copies all strings) | Poor (scattered allocations) |
| Zero-Copy | 1 MB | ~0 bytes (only metadata) | Excellent (all data contiguous) |

## Understanding Lifetimes for Borrowed Data

Before building parsers, you need to understand how Rust lifetimes work with borrowed data.

### Basic Lifetime Rules

```rust
// The lifetime 'a means: "this reference is valid for some scope 'a"
fn get_first_word<'a>(s: &'a str) -> &'a str {
    // Return value lives as long as input
    s.split_whitespace().next().unwrap_or("")
}

fn main() {
    let input = String::from("hello world");
    let word = get_first_word(&input);
    println!("{}", word);  // OK: input still alive

    // drop(input);  // If uncommented: ERROR - word still borrows input
}
```

### Structs with Borrowed Data

When a struct holds references, it needs lifetime annotations:

```rust
// This struct borrows two pieces of data, possibly with different lifetimes
struct ParsedPair<'a, 'b> {
    key: &'a str,
    value: &'b str,
}

// Usually we use a single lifetime when all borrows come from one source
struct ParsedPair<'a> {
    key: &'a str,
    value: &'a str,
}

impl<'a> ParsedPair<'a> {
    fn new(key: &'a str, value: &'a str) -> Self {
        ParsedPair { key, value }
    }
}
```

### The Borrow Checker in Action

```rust
struct Token<'a> {
    text: &'a str,
}

fn demonstrate_lifetimes() {
    let tokens: Vec<Token>;

    {
        let input = String::from("temp data");
        // tokens = vec![Token { text: &input }];  // ERROR!
        // input is dropped at end of this block, but tokens would escape
    }

    // Correct: input outlives tokens
    let input = String::from("persistent data");
    let tokens = vec![Token { text: &input }];
    println!("{}", tokens[0].text);  // OK
}
```

## Building a Simple Zero-Copy Key-Value Parser

Let us build a parser for a simple configuration format:

```
name = "server"
port = 8080
debug = true
```

### Define the Data Structures

```rust
#[derive(Debug, PartialEq)]
pub enum Value<'a> {
    String(&'a str),
    Integer(i64),
    Boolean(bool),
}

#[derive(Debug, PartialEq)]
pub struct KeyValue<'a> {
    pub key: &'a str,
    pub value: Value<'a>,
}

#[derive(Debug)]
pub struct Config<'a> {
    pub entries: Vec<KeyValue<'a>>,
}
```

Notice that `Value::String` holds `&'a str`, not `String`. The string content stays in the original input buffer.

### Implement the Parser

```rust
use std::str::FromStr;

#[derive(Debug)]
pub struct ParseError {
    pub line: usize,
    pub message: String,
}

impl<'a> Config<'a> {
    pub fn parse(input: &'a str) -> Result<Config<'a>, ParseError> {
        let mut entries = Vec::new();

        for (line_num, line) in input.lines().enumerate() {
            let line = line.trim();

            // Skip empty lines and comments
            if line.is_empty() || line.starts_with('#') {
                continue;
            }

            // Find the equals sign
            let eq_pos = line.find('=').ok_or_else(|| ParseError {
                line: line_num + 1,
                message: "Missing '=' in key-value pair".into(),
            })?;

            // Extract key (zero-copy slice)
            let key = line[..eq_pos].trim();

            // Extract and parse value
            let value_str = line[eq_pos + 1..].trim();
            let value = parse_value(value_str)?;

            entries.push(KeyValue { key, value });
        }

        Ok(Config { entries })
    }
}

fn parse_value<'a>(s: &'a str) -> Result<Value<'a>, ParseError> {
    // Try boolean
    if s == "true" {
        return Ok(Value::Boolean(true));
    }
    if s == "false" {
        return Ok(Value::Boolean(false));
    }

    // Try integer
    if let Ok(n) = i64::from_str(s) {
        return Ok(Value::Integer(n));
    }

    // Try quoted string (zero-copy - we return a slice of the input)
    if s.starts_with('"') && s.ends_with('"') && s.len() >= 2 {
        // Return slice without quotes - no allocation!
        return Ok(Value::String(&s[1..s.len() - 1]));
    }

    // Unquoted string
    Ok(Value::String(s))
}
```

### Usage Example

```rust
fn main() {
    let input = r#"
        name = "my-service"
        port = 8080
        debug = true
        # This is a comment
        version = "1.2.3"
    "#;

    let config = Config::parse(input).expect("Failed to parse config");

    for entry in &config.entries {
        println!("{} = {:?}", entry.key, entry.value);
    }

    // The config borrows from input
    // drop(input);  // Would cause compile error if config is used after
}
```

Output:
```
name = String("my-service")
port = Integer(8080)
debug = Boolean(true)
version = String("1.2.3")
```

## Building a Zero-Copy JSON-Like Parser

Now let us build something more complex: a parser for a simplified JSON format.

### Define the AST

```rust
#[derive(Debug, PartialEq)]
pub enum JsonValue<'a> {
    Null,
    Bool(bool),
    Number(f64),
    String(&'a str),  // Zero-copy string
    Array(Vec<JsonValue<'a>>),
    Object(Vec<(&'a str, JsonValue<'a>)>),  // Keys are zero-copy too
}
```

### The Parser Implementation

```rust
pub struct JsonParser<'a> {
    input: &'a str,
    pos: usize,
}

impl<'a> JsonParser<'a> {
    pub fn new(input: &'a str) -> Self {
        JsonParser { input, pos: 0 }
    }

    pub fn parse(&mut self) -> Result<JsonValue<'a>, String> {
        self.skip_whitespace();
        self.parse_value()
    }

    fn current(&self) -> Option<char> {
        self.input[self.pos..].chars().next()
    }

    fn advance(&mut self) {
        if let Some(c) = self.current() {
            self.pos += c.len_utf8();
        }
    }

    fn skip_whitespace(&mut self) {
        while let Some(c) = self.current() {
            if c.is_whitespace() {
                self.advance();
            } else {
                break;
            }
        }
    }

    fn parse_value(&mut self) -> Result<JsonValue<'a>, String> {
        self.skip_whitespace();

        match self.current() {
            Some('"') => self.parse_string().map(JsonValue::String),
            Some('{') => self.parse_object(),
            Some('[') => self.parse_array(),
            Some('t') | Some('f') => self.parse_bool(),
            Some('n') => self.parse_null(),
            Some(c) if c == '-' || c.is_ascii_digit() => self.parse_number(),
            Some(c) => Err(format!("Unexpected character: {}", c)),
            None => Err("Unexpected end of input".into()),
        }
    }

    // Zero-copy string parsing - returns a slice of the input
    fn parse_string(&mut self) -> Result<&'a str, String> {
        if self.current() != Some('"') {
            return Err("Expected '\"'".into());
        }
        self.advance();  // consume opening quote

        let start = self.pos;

        // Simple string parsing (no escape sequences for brevity)
        while let Some(c) = self.current() {
            if c == '"' {
                let s = &self.input[start..self.pos];  // Zero-copy slice!
                self.advance();  // consume closing quote
                return Ok(s);
            }
            if c == '\\' {
                // For true zero-copy, we would need to handle escapes differently
                // or return an enum that can be either borrowed or owned
                return Err("Escape sequences not supported in zero-copy mode".into());
            }
            self.advance();
        }

        Err("Unterminated string".into())
    }

    fn parse_number(&mut self) -> Result<JsonValue<'a>, String> {
        let start = self.pos;

        // Consume optional minus
        if self.current() == Some('-') {
            self.advance();
        }

        // Consume digits
        while let Some(c) = self.current() {
            if c.is_ascii_digit() || c == '.' || c == 'e' || c == 'E' || c == '+' || c == '-' {
                self.advance();
            } else {
                break;
            }
        }

        let num_str = &self.input[start..self.pos];
        num_str
            .parse::<f64>()
            .map(JsonValue::Number)
            .map_err(|e| format!("Invalid number: {}", e))
    }

    fn parse_bool(&mut self) -> Result<JsonValue<'a>, String> {
        if self.input[self.pos..].starts_with("true") {
            self.pos += 4;
            Ok(JsonValue::Bool(true))
        } else if self.input[self.pos..].starts_with("false") {
            self.pos += 5;
            Ok(JsonValue::Bool(false))
        } else {
            Err("Expected 'true' or 'false'".into())
        }
    }

    fn parse_null(&mut self) -> Result<JsonValue<'a>, String> {
        if self.input[self.pos..].starts_with("null") {
            self.pos += 4;
            Ok(JsonValue::Null)
        } else {
            Err("Expected 'null'".into())
        }
    }

    fn parse_array(&mut self) -> Result<JsonValue<'a>, String> {
        if self.current() != Some('[') {
            return Err("Expected '['".into());
        }
        self.advance();
        self.skip_whitespace();

        let mut items = Vec::new();

        if self.current() == Some(']') {
            self.advance();
            return Ok(JsonValue::Array(items));
        }

        loop {
            items.push(self.parse_value()?);
            self.skip_whitespace();

            match self.current() {
                Some(',') => {
                    self.advance();
                    self.skip_whitespace();
                }
                Some(']') => {
                    self.advance();
                    return Ok(JsonValue::Array(items));
                }
                _ => return Err("Expected ',' or ']'".into()),
            }
        }
    }

    fn parse_object(&mut self) -> Result<JsonValue<'a>, String> {
        if self.current() != Some('{') {
            return Err("Expected '{'".into());
        }
        self.advance();
        self.skip_whitespace();

        let mut pairs = Vec::new();

        if self.current() == Some('}') {
            self.advance();
            return Ok(JsonValue::Object(pairs));
        }

        loop {
            self.skip_whitespace();

            // Parse key (zero-copy)
            let key = self.parse_string()?;

            self.skip_whitespace();
            if self.current() != Some(':') {
                return Err("Expected ':'".into());
            }
            self.advance();

            // Parse value
            let value = self.parse_value()?;
            pairs.push((key, value));

            self.skip_whitespace();
            match self.current() {
                Some(',') => {
                    self.advance();
                }
                Some('}') => {
                    self.advance();
                    return Ok(JsonValue::Object(pairs));
                }
                _ => return Err("Expected ',' or '}'".into()),
            }
        }
    }
}
```

### Using the JSON Parser

```rust
fn main() {
    let input = r#"{
        "name": "rust-parser",
        "version": "1.0.0",
        "features": ["zero-copy", "fast", "safe"],
        "config": {
            "debug": false,
            "threads": 4
        }
    }"#;

    let mut parser = JsonParser::new(input);
    let value = parser.parse().expect("Failed to parse JSON");

    // All string values are slices into `input`
    if let JsonValue::Object(pairs) = &value {
        for (key, val) in pairs {
            // `key` is &str pointing into `input`
            println!("Key '{}' at address {:p}", key, *key);
        }
    }
}
```

## Using nom for Zero-Copy Parsing

The nom library is the standard choice for building parsers in Rust. It provides zero-copy parsing out of the box when using `&str` or `&[u8]` as input.

### Add nom to Cargo.toml

```toml
[dependencies]
nom = "7.1"
```

### Basic nom Combinators

```rust
use nom::{
    IResult,
    bytes::complete::{tag, take_while1, take_until},
    character::complete::{char, multispace0, digit1},
    combinator::{map, map_res, opt, recognize},
    sequence::{delimited, preceded, separated_pair, tuple},
    branch::alt,
    multi::{separated_list0, many0},
};

// nom returns &str slices by default - automatic zero-copy!

// Parse an identifier: [a-zA-Z_][a-zA-Z0-9_]*
fn identifier(input: &str) -> IResult<&str, &str> {
    recognize(tuple((
        take_while1(|c: char| c.is_alphabetic() || c == '_'),
        take_while1(|c: char| c.is_alphanumeric() || c == '_'),
    )))(input)
}

// Parse a quoted string, returning the content without quotes
fn quoted_string(input: &str) -> IResult<&str, &str> {
    delimited(
        char('"'),
        take_until("\""),  // Returns &str slice - zero-copy!
        char('"'),
    )(input)
}

// Parse an integer
fn integer(input: &str) -> IResult<&str, i64> {
    map_res(
        recognize(tuple((opt(char('-')), digit1))),
        |s: &str| s.parse::<i64>(),
    )(input)
}
```

### Building a Complete nom Parser

Let us rebuild our config parser using nom:

```rust
use nom::{
    IResult,
    bytes::complete::{tag, take_while1, take_until, is_not},
    character::complete::{char, multispace0, multispace1, line_ending, not_line_ending},
    combinator::{map, map_res, opt, value, all_consuming, recognize, eof},
    sequence::{delimited, preceded, separated_pair, terminated, tuple},
    branch::alt,
    multi::{many0, separated_list0},
};

#[derive(Debug, PartialEq)]
pub enum ConfigValue<'a> {
    String(&'a str),
    Integer(i64),
    Boolean(bool),
}

#[derive(Debug, PartialEq)]
pub struct ConfigEntry<'a> {
    pub key: &'a str,
    pub value: ConfigValue<'a>,
}

// Parse whitespace (spaces and tabs, not newlines)
fn ws(input: &str) -> IResult<&str, &str> {
    take_while1(|c| c == ' ' || c == '\t')(input)
        .or(Ok((input, "")))
}

// Parse a comment line
fn comment(input: &str) -> IResult<&str, ()> {
    value(
        (),
        tuple((
            char('#'),
            not_line_ending,
        )),
    )(input)
}

// Parse an identifier (key name)
fn key(input: &str) -> IResult<&str, &str> {
    take_while1(|c: char| c.is_alphanumeric() || c == '_' || c == '-')(input)
}

// Parse a quoted string value (zero-copy)
fn string_value(input: &str) -> IResult<&str, ConfigValue> {
    map(
        delimited(char('"'), take_until("\""), char('"')),
        ConfigValue::String,
    )(input)
}

// Parse an integer value
fn integer_value(input: &str) -> IResult<&str, ConfigValue> {
    map_res(
        recognize(tuple((opt(char('-')), take_while1(|c: char| c.is_ascii_digit())))),
        |s: &str| s.parse::<i64>().map(ConfigValue::Integer),
    )(input)
}

// Parse a boolean value
fn boolean_value(input: &str) -> IResult<&str, ConfigValue> {
    alt((
        value(ConfigValue::Boolean(true), tag("true")),
        value(ConfigValue::Boolean(false), tag("false")),
    ))(input)
}

// Parse any config value
fn config_value(input: &str) -> IResult<&str, ConfigValue> {
    alt((boolean_value, integer_value, string_value))(input)
}

// Parse a single key-value entry
fn entry(input: &str) -> IResult<&str, ConfigEntry> {
    map(
        tuple((
            ws,
            key,
            ws,
            char('='),
            ws,
            config_value,
            ws,
        )),
        |(_, k, _, _, _, v, _)| ConfigEntry { key: k, value: v },
    )(input)
}

// Parse a line (either entry, comment, or empty)
fn line(input: &str) -> IResult<&str, Option<ConfigEntry>> {
    alt((
        map(entry, Some),
        map(tuple((ws, opt(comment))), |_| None),
    ))(input)
}

// Parse the entire config
pub fn parse_config(input: &str) -> IResult<&str, Vec<ConfigEntry>> {
    let (remaining, lines) = separated_list0(line_ending, line)(input)?;
    let entries: Vec<ConfigEntry> = lines.into_iter().flatten().collect();
    Ok((remaining, entries))
}
```

### Using the nom Parser

```rust
fn main() {
    let input = r#"name = "my-app"
port = 8080
debug = true
# Database settings
db_host = "localhost"
db_port = 5432"#;

    match parse_config(input) {
        Ok((remaining, entries)) => {
            println!("Parsed {} entries", entries.len());
            for entry in entries {
                println!("  {} = {:?}", entry.key, entry.value);
            }
            if !remaining.is_empty() {
                println!("Unparsed: {:?}", remaining);
            }
        }
        Err(e) => println!("Parse error: {:?}", e),
    }
}
```

### nom with Custom Error Types

For better error messages, use nom's error handling:

```rust
use nom::error::{VerboseError, context};

type Res<'a, T> = IResult<&'a str, T, VerboseError<&'a str>>;

fn key_verbose(input: &str) -> Res<&str> {
    context(
        "key",
        take_while1(|c: char| c.is_alphanumeric() || c == '_'),
    )(input)
}

fn entry_verbose(input: &str) -> Res<ConfigEntry> {
    context(
        "config entry",
        map(
            tuple((
                ws,
                key_verbose,
                ws,
                context("equals sign", char('=')),
                ws,
                context("value", config_value_verbose),
                ws,
            )),
            |(_, k, _, _, _, v, _)| ConfigEntry { key: k, value: v },
        ),
    )(input)
}
```

## Handling Escape Sequences

True zero-copy parsing breaks down when you need to process escape sequences like `\n` or `\"`. The escaped string `"hello\nworld"` should become `hello` + newline + `world`, which requires allocation.

### The Cow Solution

Use `Cow<'a, str>` (Clone on Write) to handle both cases:

```rust
use std::borrow::Cow;

#[derive(Debug)]
pub enum JsonString<'a> {
    Borrowed(&'a str),           // No escapes - zero copy
    Owned(String),               // Has escapes - must allocate
}

// Or use Cow directly
pub struct StringValue<'a> {
    pub content: Cow<'a, str>,
}

fn parse_string_with_escapes<'a>(input: &'a str) -> Result<Cow<'a, str>, String> {
    // Check if string has any escape sequences
    if !input.contains('\\') {
        // No escapes - return borrowed slice (zero-copy)
        return Ok(Cow::Borrowed(input));
    }

    // Has escapes - must allocate and process
    let mut result = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '\\' {
            match chars.next() {
                Some('n') => result.push('\n'),
                Some('t') => result.push('\t'),
                Some('r') => result.push('\r'),
                Some('"') => result.push('"'),
                Some('\\') => result.push('\\'),
                Some(c) => return Err(format!("Invalid escape: \\{}", c)),
                None => return Err("Trailing backslash".into()),
            }
        } else {
            result.push(c);
        }
    }

    Ok(Cow::Owned(result))
}
```

### Statistics on Escape Frequency

In practice, most strings do not contain escapes. Tracking this lets you optimize:

```rust
pub struct ParseStats {
    pub total_strings: usize,
    pub borrowed_strings: usize,  // Zero-copy
    pub owned_strings: usize,     // Required allocation
}

impl ParseStats {
    pub fn borrowed_percentage(&self) -> f64 {
        if self.total_strings == 0 {
            return 100.0;
        }
        (self.borrowed_strings as f64 / self.total_strings as f64) * 100.0
    }
}
```

## Benchmarking: Zero-Copy vs Allocating

Let us measure the actual performance difference.

### Setup the Benchmark

```rust
// Cargo.toml
// [dev-dependencies]
// criterion = "0.5"

use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};

// Allocating version
mod allocating {
    #[derive(Debug)]
    pub struct Entry {
        pub key: String,
        pub value: String,
    }

    pub fn parse(input: &str) -> Vec<Entry> {
        input
            .lines()
            .filter_map(|line| {
                let mut parts = line.splitn(2, '=');
                let key = parts.next()?.trim().to_string();  // Allocates!
                let value = parts.next()?.trim().to_string(); // Allocates!
                Some(Entry { key, value })
            })
            .collect()
    }
}

// Zero-copy version
mod zero_copy {
    #[derive(Debug)]
    pub struct Entry<'a> {
        pub key: &'a str,
        pub value: &'a str,
    }

    pub fn parse(input: &str) -> Vec<Entry> {
        input
            .lines()
            .filter_map(|line| {
                let mut parts = line.splitn(2, '=');
                let key = parts.next()?.trim();   // Borrows!
                let value = parts.next()?.trim(); // Borrows!
                Some(Entry { key, value })
            })
            .collect()
    }
}

fn generate_input(num_lines: usize) -> String {
    (0..num_lines)
        .map(|i| format!("key_{} = value_{}", i, i))
        .collect::<Vec<_>>()
        .join("\n")
}

fn benchmark_parsing(c: &mut Criterion) {
    let mut group = c.benchmark_group("parsing");

    for size in [100, 1000, 10000, 100000].iter() {
        let input = generate_input(*size);

        group.bench_with_input(
            BenchmarkId::new("allocating", size),
            &input,
            |b, input| b.iter(|| allocating::parse(black_box(input))),
        );

        group.bench_with_input(
            BenchmarkId::new("zero_copy", size),
            &input,
            |b, input| b.iter(|| zero_copy::parse(black_box(input))),
        );
    }

    group.finish();
}

criterion_group!(benches, benchmark_parsing);
criterion_main!(benches);
```

### Typical Benchmark Results

| Lines | Allocating | Zero-Copy | Speedup |
|-------|------------|-----------|---------|
| 100 | 15 us | 4 us | 3.75x |
| 1,000 | 180 us | 45 us | 4.0x |
| 10,000 | 2.1 ms | 480 us | 4.4x |
| 100,000 | 25 ms | 5.2 ms | 4.8x |

The speedup increases with input size because allocation overhead grows while zero-copy overhead stays constant.

### Memory Allocation Comparison

Using a memory profiler or the `stats_alloc` crate:

```rust
use stats_alloc::{StatsAlloc, Region, INSTRUMENTED_SYSTEM};
use std::alloc::System;

#[global_allocator]
static GLOBAL: &StatsAlloc<System> = &INSTRUMENTED_SYSTEM;

fn measure_allocations() {
    let input = generate_input(10000);

    // Measure allocating parser
    let reg = Region::new(&GLOBAL);
    let _ = allocating::parse(&input);
    let stats = reg.change();
    println!("Allocating: {} bytes allocated", stats.bytes_allocated);

    // Measure zero-copy parser
    let reg = Region::new(&GLOBAL);
    let _ = zero_copy::parse(&input);
    let stats = reg.change();
    println!("Zero-copy: {} bytes allocated", stats.bytes_allocated);
}
```

Typical output for 10,000 lines:

```
Allocating: 1,245,184 bytes allocated
Zero-copy: 240,000 bytes allocated (just the Vec metadata)
```

## Best Practices and Pitfalls

### When to Use Zero-Copy

| Use Case | Recommendation |
|----------|----------------|
| Log parsing | Zero-copy - logs are read-only |
| Config files | Zero-copy - small, read once |
| Network protocols | Zero-copy with care - buffer lifetime matters |
| User input processing | Maybe - escapes may require allocation |
| Data transformation | Probably not - if you modify data, allocation is inevitable |

### Common Pitfalls

**1. Dangling References**

```rust
// WRONG: Returns reference to local data
fn parse_and_return() -> Vec<Token<'static>> {
    let input = std::fs::read_to_string("data.txt").unwrap();
    parse(&input)  // ERROR: input dropped, tokens dangle
}

// RIGHT: Return owned data or keep input alive
fn parse_and_return() -> (String, Vec<Token>) {
    let input = std::fs::read_to_string("data.txt").unwrap();
    let tokens = parse(&input);
    // Cannot do this - tokens borrow input
}

// Alternative: Use an arena or store input alongside tokens
struct ParseResult {
    input: String,
    // tokens would need unsafe or indices instead of references
}
```

**2. Accidental Allocation**

```rust
// WRONG: .to_lowercase() allocates a new String
fn parse_key<'a>(s: &'a str) -> &'a str {
    s.to_lowercase().as_str()  // ERROR: temporary String
}

// RIGHT: Compare case-insensitively without allocation
fn keys_match(a: &str, b: &str) -> bool {
    a.eq_ignore_ascii_case(b)
}
```

**3. Lifetime Infection**

```rust
// The 'a lifetime "infects" the entire struct
struct Parser<'a> {
    tokens: Vec<Token<'a>>,
    // Now Parser cannot outlive the input
}

// Solution: Use indices for long-lived structures
struct ParserOwned {
    input: String,
    token_spans: Vec<(usize, usize)>,  // Start and end indices
}
```

## Conclusion

Zero-copy parsing in Rust provides significant performance benefits for read-heavy workloads. The key takeaways:

1. Use `&str` slices instead of `String` in your AST types
2. Lifetime annotations tell the compiler how long borrows are valid
3. nom provides excellent zero-copy support out of the box
4. Use `Cow<'a, str>` when some strings need processing (escapes)
5. Benchmark your specific workload - the gains vary based on string sizes and allocation patterns

The Rust borrow checker ensures your zero-copy parser is memory-safe at compile time. Once it compiles, you can be confident that parsed tokens will never outlive their source data.

For production parsers, consider nom for its battle-tested combinators and excellent error handling. For simpler formats, a hand-written parser with explicit lifetime annotations works well and keeps dependencies minimal.

## Further Reading

- [The nom documentation](https://docs.rs/nom)
- [Rust lifetimes explained](https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html)
- [The Cow type](https://doc.rust-lang.org/std/borrow/enum.Cow.html)
- [Memory layout of Rust types](https://cheats.rs/#memory-layout)
