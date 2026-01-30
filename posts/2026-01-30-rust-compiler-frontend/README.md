# How to Build a Compiler Frontend in Rust

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Rust, Compilers, Parsing, Programming Languages

Description: Build a compiler frontend in Rust covering lexical analysis, parsing with recursive descent, AST construction, and semantic analysis fundamentals.

---

Building a compiler frontend is one of the most rewarding projects for any programmer. In this post, we will walk through creating a complete compiler frontend in Rust, covering lexical analysis, parsing, AST construction, and basic semantic analysis. We will build a frontend for a simple expression language that supports variables, arithmetic operations, and basic type checking.

## Project Structure

Before diving into code, let us set up our project structure:

```
compiler-frontend/
├── Cargo.toml
└── src/
    ├── main.rs
    ├── lexer.rs
    ├── token.rs
    ├── parser.rs
    ├── ast.rs
    └── type_checker.rs
```

## Part 1: Token Types and Definitions

The first step in any compiler is defining what tokens our language supports. Rust enums are perfect for this because they can hold associated data and the compiler enforces exhaustive pattern matching.

Here is our token definition with all supported token types:

```rust
// src/token.rs

#[derive(Debug, Clone, PartialEq)]
pub enum TokenKind {
    // Literals
    Integer(i64),
    Float(f64),
    Identifier(String),
    StringLiteral(String),

    // Keywords
    Let,
    Fn,
    If,
    Else,
    Return,
    True,
    False,

    // Types
    IntType,    // int
    FloatType,  // float
    BoolType,   // bool
    StringType, // string

    // Operators
    Plus,
    Minus,
    Star,
    Slash,
    Percent,
    Equal,
    EqualEqual,
    BangEqual,
    Less,
    LessEqual,
    Greater,
    GreaterEqual,
    And,
    Or,
    Bang,

    // Delimiters
    LeftParen,
    RightParen,
    LeftBrace,
    RightBrace,
    Semicolon,
    Colon,
    Comma,
    Arrow,

    // Special
    Eof,
}

#[derive(Debug, Clone)]
pub struct Token {
    pub kind: TokenKind,
    pub lexeme: String,
    pub line: usize,
    pub column: usize,
}

impl Token {
    pub fn new(kind: TokenKind, lexeme: String, line: usize, column: usize) -> Self {
        Token { kind, lexeme, line, column }
    }
}
```

The table below shows how source characters map to token types:

| Source Pattern | Token Kind | Example |
|----------------|------------|---------|
| `[0-9]+` | Integer | `42` |
| `[0-9]+\.[0-9]+` | Float | `3.14` |
| `[a-zA-Z_][a-zA-Z0-9_]*` | Identifier | `my_var` |
| `".*"` | StringLiteral | `"hello"` |
| `let` | Let | `let x = 5` |
| `+`, `-`, `*`, `/` | Operators | `a + b` |

## Part 2: The Lexer

The lexer (or tokenizer) converts raw source code into a stream of tokens. Our lexer maintains position tracking for error reporting and handles whitespace, comments, and multi-character tokens.

```rust
// src/lexer.rs

use crate::token::{Token, TokenKind};

pub struct Lexer {
    source: Vec<char>,
    tokens: Vec<Token>,
    start: usize,
    current: usize,
    line: usize,
    column: usize,
    errors: Vec<LexerError>,
}

#[derive(Debug, Clone)]
pub struct LexerError {
    pub message: String,
    pub line: usize,
    pub column: usize,
}

impl Lexer {
    pub fn new(source: &str) -> Self {
        Lexer {
            source: source.chars().collect(),
            tokens: Vec::new(),
            start: 0,
            current: 0,
            line: 1,
            column: 1,
            errors: Vec::new(),
        }
    }

    pub fn tokenize(&mut self) -> Result<Vec<Token>, Vec<LexerError>> {
        while !self.is_at_end() {
            self.start = self.current;
            self.scan_token();
        }

        self.tokens.push(Token::new(
            TokenKind::Eof,
            String::new(),
            self.line,
            self.column,
        ));

        if self.errors.is_empty() {
            Ok(self.tokens.clone())
        } else {
            Err(self.errors.clone())
        }
    }

    fn scan_token(&mut self) {
        let c = self.advance();

        match c {
            // Single character tokens
            '(' => self.add_token(TokenKind::LeftParen),
            ')' => self.add_token(TokenKind::RightParen),
            '{' => self.add_token(TokenKind::LeftBrace),
            '}' => self.add_token(TokenKind::RightBrace),
            ';' => self.add_token(TokenKind::Semicolon),
            ':' => self.add_token(TokenKind::Colon),
            ',' => self.add_token(TokenKind::Comma),
            '+' => self.add_token(TokenKind::Plus),
            '*' => self.add_token(TokenKind::Star),
            '%' => self.add_token(TokenKind::Percent),

            // Potentially multi-character tokens
            '-' => {
                if self.match_char('>') {
                    self.add_token(TokenKind::Arrow);
                } else {
                    self.add_token(TokenKind::Minus);
                }
            }
            '/' => {
                if self.match_char('/') {
                    // Single line comment, consume until end of line
                    while self.peek() != '\n' && !self.is_at_end() {
                        self.advance();
                    }
                } else {
                    self.add_token(TokenKind::Slash);
                }
            }
            '=' => {
                if self.match_char('=') {
                    self.add_token(TokenKind::EqualEqual);
                } else {
                    self.add_token(TokenKind::Equal);
                }
            }
            '!' => {
                if self.match_char('=') {
                    self.add_token(TokenKind::BangEqual);
                } else {
                    self.add_token(TokenKind::Bang);
                }
            }
            '<' => {
                if self.match_char('=') {
                    self.add_token(TokenKind::LessEqual);
                } else {
                    self.add_token(TokenKind::Less);
                }
            }
            '>' => {
                if self.match_char('=') {
                    self.add_token(TokenKind::GreaterEqual);
                } else {
                    self.add_token(TokenKind::Greater);
                }
            }
            '&' => {
                if self.match_char('&') {
                    self.add_token(TokenKind::And);
                } else {
                    self.error("Expected '&&' for logical and");
                }
            }
            '|' => {
                if self.match_char('|') {
                    self.add_token(TokenKind::Or);
                } else {
                    self.error("Expected '||' for logical or");
                }
            }

            // Whitespace
            ' ' | '\r' | '\t' => {}
            '\n' => {
                self.line += 1;
                self.column = 1;
            }

            // String literals
            '"' => self.string(),

            // Numbers and identifiers
            _ => {
                if c.is_ascii_digit() {
                    self.number();
                } else if c.is_alphabetic() || c == '_' {
                    self.identifier();
                } else {
                    self.error(&format!("Unexpected character: {}", c));
                }
            }
        }
    }

    fn string(&mut self) {
        let start_line = self.line;
        let start_col = self.column;

        while self.peek() != '"' && !self.is_at_end() {
            if self.peek() == '\n' {
                self.line += 1;
                self.column = 1;
            }
            self.advance();
        }

        if self.is_at_end() {
            self.errors.push(LexerError {
                message: "Unterminated string".to_string(),
                line: start_line,
                column: start_col,
            });
            return;
        }

        self.advance(); // Consume closing quote

        // Extract string value without quotes
        let value: String = self.source[self.start + 1..self.current - 1]
            .iter()
            .collect();
        self.add_token(TokenKind::StringLiteral(value));
    }

    fn number(&mut self) {
        while self.peek().is_ascii_digit() {
            self.advance();
        }

        // Check for decimal point
        if self.peek() == '.' && self.peek_next().is_ascii_digit() {
            self.advance(); // Consume the dot

            while self.peek().is_ascii_digit() {
                self.advance();
            }

            let value: String = self.source[self.start..self.current].iter().collect();
            let float_val: f64 = value.parse().unwrap();
            self.add_token(TokenKind::Float(float_val));
        } else {
            let value: String = self.source[self.start..self.current].iter().collect();
            let int_val: i64 = value.parse().unwrap();
            self.add_token(TokenKind::Integer(int_val));
        }
    }

    fn identifier(&mut self) {
        while self.peek().is_alphanumeric() || self.peek() == '_' {
            self.advance();
        }

        let text: String = self.source[self.start..self.current].iter().collect();

        // Check for keywords
        let kind = match text.as_str() {
            "let" => TokenKind::Let,
            "fn" => TokenKind::Fn,
            "if" => TokenKind::If,
            "else" => TokenKind::Else,
            "return" => TokenKind::Return,
            "true" => TokenKind::True,
            "false" => TokenKind::False,
            "int" => TokenKind::IntType,
            "float" => TokenKind::FloatType,
            "bool" => TokenKind::BoolType,
            "string" => TokenKind::StringType,
            _ => TokenKind::Identifier(text.clone()),
        };

        self.add_token(kind);
    }

    // Helper methods

    fn advance(&mut self) -> char {
        let c = self.source[self.current];
        self.current += 1;
        self.column += 1;
        c
    }

    fn peek(&self) -> char {
        if self.is_at_end() { '\0' } else { self.source[self.current] }
    }

    fn peek_next(&self) -> char {
        if self.current + 1 >= self.source.len() {
            '\0'
        } else {
            self.source[self.current + 1]
        }
    }

    fn match_char(&mut self, expected: char) -> bool {
        if self.is_at_end() || self.source[self.current] != expected {
            return false;
        }
        self.current += 1;
        self.column += 1;
        true
    }

    fn is_at_end(&self) -> bool {
        self.current >= self.source.len()
    }

    fn add_token(&mut self, kind: TokenKind) {
        let lexeme: String = self.source[self.start..self.current].iter().collect();
        self.tokens.push(Token::new(kind, lexeme, self.line, self.column));
    }

    fn error(&mut self, message: &str) {
        self.errors.push(LexerError {
            message: message.to_string(),
            line: self.line,
            column: self.column,
        });
    }
}
```

## Part 3: Abstract Syntax Tree

The AST represents the hierarchical structure of our program. We define nodes for expressions, statements, and declarations. Rust enums with Box for recursive types work well here.

```rust
// src/ast.rs

#[derive(Debug, Clone, PartialEq)]
pub enum Type {
    Int,
    Float,
    Bool,
    String,
    Void,
    Function { params: Vec<Type>, return_type: Box<Type> },
    Unknown,
}

#[derive(Debug, Clone)]
pub enum Expr {
    // Literals
    IntLiteral(i64),
    FloatLiteral(f64),
    BoolLiteral(bool),
    StringLiteral(String),

    // Variable reference
    Variable {
        name: String,
        line: usize,
    },

    // Binary operations
    Binary {
        left: Box<Expr>,
        operator: BinaryOp,
        right: Box<Expr>,
        line: usize,
    },

    // Unary operations
    Unary {
        operator: UnaryOp,
        operand: Box<Expr>,
        line: usize,
    },

    // Function call
    Call {
        callee: Box<Expr>,
        arguments: Vec<Expr>,
        line: usize,
    },

    // Grouping (parentheses)
    Grouping(Box<Expr>),

    // Conditional expression
    If {
        condition: Box<Expr>,
        then_branch: Box<Expr>,
        else_branch: Option<Box<Expr>>,
        line: usize,
    },
}

#[derive(Debug, Clone, Copy)]
pub enum BinaryOp {
    Add,
    Subtract,
    Multiply,
    Divide,
    Modulo,
    Equal,
    NotEqual,
    Less,
    LessEqual,
    Greater,
    GreaterEqual,
    And,
    Or,
}

#[derive(Debug, Clone, Copy)]
pub enum UnaryOp {
    Negate,
    Not,
}

#[derive(Debug, Clone)]
pub enum Stmt {
    // Expression statement
    Expression(Expr),

    // Variable declaration
    Let {
        name: String,
        type_annotation: Option<Type>,
        initializer: Expr,
        line: usize,
    },

    // Return statement
    Return {
        value: Option<Expr>,
        line: usize,
    },

    // Block of statements
    Block(Vec<Stmt>),
}

#[derive(Debug, Clone)]
pub struct Function {
    pub name: String,
    pub params: Vec<(String, Type)>,
    pub return_type: Type,
    pub body: Vec<Stmt>,
    pub line: usize,
}

#[derive(Debug, Clone)]
pub struct Program {
    pub functions: Vec<Function>,
    pub statements: Vec<Stmt>,
}
```

## Part 4: Recursive Descent Parser

Our parser uses recursive descent, which maps grammar rules directly to functions. Each function handles one grammar production and calls others for nested rules. This approach is intuitive and produces good error messages.

The grammar we will parse (in rough EBNF):

```
program     -> (function | statement)* EOF
function    -> "fn" IDENTIFIER "(" params? ")" "->" type block
params      -> param ("," param)*
param       -> IDENTIFIER ":" type
type        -> "int" | "float" | "bool" | "string"
statement   -> letStmt | returnStmt | exprStmt | block
letStmt     -> "let" IDENTIFIER (":" type)? "=" expression ";"
returnStmt  -> "return" expression? ";"
exprStmt    -> expression ";"
block       -> "{" statement* "}"
expression  -> or
or          -> and ("||" and)*
and         -> equality ("&&" equality)*
equality    -> comparison (("==" | "!=") comparison)*
comparison  -> term (("<" | "<=" | ">" | ">=") term)*
term        -> factor (("+" | "-") factor)*
factor      -> unary (("*" | "/" | "%") unary)*
unary       -> ("!" | "-") unary | call
call        -> primary ("(" arguments? ")")*
primary     -> NUMBER | STRING | "true" | "false" | IDENTIFIER | "(" expression ")"
```

Here is the parser implementation:

```rust
// src/parser.rs

use crate::ast::*;
use crate::token::{Token, TokenKind};

pub struct Parser {
    tokens: Vec<Token>,
    current: usize,
    errors: Vec<ParseError>,
}

#[derive(Debug, Clone)]
pub struct ParseError {
    pub message: String,
    pub line: usize,
    pub column: usize,
}

impl Parser {
    pub fn new(tokens: Vec<Token>) -> Self {
        Parser {
            tokens,
            current: 0,
            errors: Vec::new(),
        }
    }

    pub fn parse(&mut self) -> Result<Program, Vec<ParseError>> {
        let mut functions = Vec::new();
        let mut statements = Vec::new();

        while !self.is_at_end() {
            if self.check(&TokenKind::Fn) {
                match self.function() {
                    Ok(func) => functions.push(func),
                    Err(_) => self.synchronize(),
                }
            } else {
                match self.statement() {
                    Ok(stmt) => statements.push(stmt),
                    Err(_) => self.synchronize(),
                }
            }
        }

        if self.errors.is_empty() {
            Ok(Program { functions, statements })
        } else {
            Err(self.errors.clone())
        }
    }

    fn function(&mut self) -> Result<Function, ()> {
        self.consume(&TokenKind::Fn, "Expected 'fn'")?;

        let name_token = self.consume_identifier("Expected function name")?;
        let name = match &name_token.kind {
            TokenKind::Identifier(n) => n.clone(),
            _ => unreachable!(),
        };
        let line = name_token.line;

        self.consume(&TokenKind::LeftParen, "Expected '(' after function name")?;

        let mut params = Vec::new();
        if !self.check(&TokenKind::RightParen) {
            loop {
                let param_name = self.consume_identifier("Expected parameter name")?;
                let param_name = match &param_name.kind {
                    TokenKind::Identifier(n) => n.clone(),
                    _ => unreachable!(),
                };

                self.consume(&TokenKind::Colon, "Expected ':' after parameter name")?;
                let param_type = self.parse_type()?;

                params.push((param_name, param_type));

                if !self.match_token(&[TokenKind::Comma]) {
                    break;
                }
            }
        }

        self.consume(&TokenKind::RightParen, "Expected ')' after parameters")?;
        self.consume(&TokenKind::Arrow, "Expected '->' before return type")?;

        let return_type = self.parse_type()?;

        self.consume(&TokenKind::LeftBrace, "Expected '{' before function body")?;
        let body = self.block_statements()?;

        Ok(Function { name, params, return_type, body, line })
    }

    fn parse_type(&mut self) -> Result<Type, ()> {
        if self.match_token(&[TokenKind::IntType]) {
            Ok(Type::Int)
        } else if self.match_token(&[TokenKind::FloatType]) {
            Ok(Type::Float)
        } else if self.match_token(&[TokenKind::BoolType]) {
            Ok(Type::Bool)
        } else if self.match_token(&[TokenKind::StringType]) {
            Ok(Type::String)
        } else {
            self.error("Expected type");
            Err(())
        }
    }

    fn statement(&mut self) -> Result<Stmt, ()> {
        if self.match_token(&[TokenKind::Let]) {
            self.let_statement()
        } else if self.match_token(&[TokenKind::Return]) {
            self.return_statement()
        } else if self.match_token(&[TokenKind::LeftBrace]) {
            Ok(Stmt::Block(self.block_statements()?))
        } else {
            self.expression_statement()
        }
    }

    fn let_statement(&mut self) -> Result<Stmt, ()> {
        let name_token = self.consume_identifier("Expected variable name")?;
        let name = match &name_token.kind {
            TokenKind::Identifier(n) => n.clone(),
            _ => unreachable!(),
        };
        let line = name_token.line;

        let type_annotation = if self.match_token(&[TokenKind::Colon]) {
            Some(self.parse_type()?)
        } else {
            None
        };

        self.consume(&TokenKind::Equal, "Expected '=' after variable name")?;
        let initializer = self.expression()?;
        self.consume(&TokenKind::Semicolon, "Expected ';' after variable declaration")?;

        Ok(Stmt::Let { name, type_annotation, initializer, line })
    }

    fn return_statement(&mut self) -> Result<Stmt, ()> {
        let line = self.previous().line;

        let value = if !self.check(&TokenKind::Semicolon) {
            Some(self.expression()?)
        } else {
            None
        };

        self.consume(&TokenKind::Semicolon, "Expected ';' after return")?;

        Ok(Stmt::Return { value, line })
    }

    fn expression_statement(&mut self) -> Result<Stmt, ()> {
        let expr = self.expression()?;
        self.consume(&TokenKind::Semicolon, "Expected ';' after expression")?;
        Ok(Stmt::Expression(expr))
    }

    fn block_statements(&mut self) -> Result<Vec<Stmt>, ()> {
        let mut statements = Vec::new();

        while !self.check(&TokenKind::RightBrace) && !self.is_at_end() {
            statements.push(self.statement()?);
        }

        self.consume(&TokenKind::RightBrace, "Expected '}' after block")?;
        Ok(statements)
    }

    // Expression parsing using precedence climbing

    fn expression(&mut self) -> Result<Expr, ()> {
        self.or_expr()
    }

    fn or_expr(&mut self) -> Result<Expr, ()> {
        let mut expr = self.and_expr()?;

        while self.match_token(&[TokenKind::Or]) {
            let line = self.previous().line;
            let right = self.and_expr()?;
            expr = Expr::Binary {
                left: Box::new(expr),
                operator: BinaryOp::Or,
                right: Box::new(right),
                line,
            };
        }

        Ok(expr)
    }

    fn and_expr(&mut self) -> Result<Expr, ()> {
        let mut expr = self.equality()?;

        while self.match_token(&[TokenKind::And]) {
            let line = self.previous().line;
            let right = self.equality()?;
            expr = Expr::Binary {
                left: Box::new(expr),
                operator: BinaryOp::And,
                right: Box::new(right),
                line,
            };
        }

        Ok(expr)
    }

    fn equality(&mut self) -> Result<Expr, ()> {
        let mut expr = self.comparison()?;

        while self.match_token(&[TokenKind::EqualEqual, TokenKind::BangEqual]) {
            let operator = match self.previous().kind {
                TokenKind::EqualEqual => BinaryOp::Equal,
                TokenKind::BangEqual => BinaryOp::NotEqual,
                _ => unreachable!(),
            };
            let line = self.previous().line;
            let right = self.comparison()?;
            expr = Expr::Binary {
                left: Box::new(expr),
                operator,
                right: Box::new(right),
                line,
            };
        }

        Ok(expr)
    }

    fn comparison(&mut self) -> Result<Expr, ()> {
        let mut expr = self.term()?;

        while self.match_token(&[
            TokenKind::Less,
            TokenKind::LessEqual,
            TokenKind::Greater,
            TokenKind::GreaterEqual,
        ]) {
            let operator = match self.previous().kind {
                TokenKind::Less => BinaryOp::Less,
                TokenKind::LessEqual => BinaryOp::LessEqual,
                TokenKind::Greater => BinaryOp::Greater,
                TokenKind::GreaterEqual => BinaryOp::GreaterEqual,
                _ => unreachable!(),
            };
            let line = self.previous().line;
            let right = self.term()?;
            expr = Expr::Binary {
                left: Box::new(expr),
                operator,
                right: Box::new(right),
                line,
            };
        }

        Ok(expr)
    }

    fn term(&mut self) -> Result<Expr, ()> {
        let mut expr = self.factor()?;

        while self.match_token(&[TokenKind::Plus, TokenKind::Minus]) {
            let operator = match self.previous().kind {
                TokenKind::Plus => BinaryOp::Add,
                TokenKind::Minus => BinaryOp::Subtract,
                _ => unreachable!(),
            };
            let line = self.previous().line;
            let right = self.factor()?;
            expr = Expr::Binary {
                left: Box::new(expr),
                operator,
                right: Box::new(right),
                line,
            };
        }

        Ok(expr)
    }

    fn factor(&mut self) -> Result<Expr, ()> {
        let mut expr = self.unary()?;

        while self.match_token(&[TokenKind::Star, TokenKind::Slash, TokenKind::Percent]) {
            let operator = match self.previous().kind {
                TokenKind::Star => BinaryOp::Multiply,
                TokenKind::Slash => BinaryOp::Divide,
                TokenKind::Percent => BinaryOp::Modulo,
                _ => unreachable!(),
            };
            let line = self.previous().line;
            let right = self.unary()?;
            expr = Expr::Binary {
                left: Box::new(expr),
                operator,
                right: Box::new(right),
                line,
            };
        }

        Ok(expr)
    }

    fn unary(&mut self) -> Result<Expr, ()> {
        if self.match_token(&[TokenKind::Bang, TokenKind::Minus]) {
            let operator = match self.previous().kind {
                TokenKind::Bang => UnaryOp::Not,
                TokenKind::Minus => UnaryOp::Negate,
                _ => unreachable!(),
            };
            let line = self.previous().line;
            let operand = self.unary()?;
            return Ok(Expr::Unary {
                operator,
                operand: Box::new(operand),
                line,
            });
        }

        self.call()
    }

    fn call(&mut self) -> Result<Expr, ()> {
        let mut expr = self.primary()?;

        loop {
            if self.match_token(&[TokenKind::LeftParen]) {
                expr = self.finish_call(expr)?;
            } else {
                break;
            }
        }

        Ok(expr)
    }

    fn finish_call(&mut self, callee: Expr) -> Result<Expr, ()> {
        let line = self.previous().line;
        let mut arguments = Vec::new();

        if !self.check(&TokenKind::RightParen) {
            loop {
                arguments.push(self.expression()?);
                if !self.match_token(&[TokenKind::Comma]) {
                    break;
                }
            }
        }

        self.consume(&TokenKind::RightParen, "Expected ')' after arguments")?;

        Ok(Expr::Call {
            callee: Box::new(callee),
            arguments,
            line,
        })
    }

    fn primary(&mut self) -> Result<Expr, ()> {
        if self.match_token(&[TokenKind::True]) {
            return Ok(Expr::BoolLiteral(true));
        }

        if self.match_token(&[TokenKind::False]) {
            return Ok(Expr::BoolLiteral(false));
        }

        if let TokenKind::Integer(n) = self.peek().kind {
            self.advance();
            return Ok(Expr::IntLiteral(n));
        }

        if let TokenKind::Float(n) = self.peek().kind {
            self.advance();
            return Ok(Expr::FloatLiteral(n));
        }

        if let TokenKind::StringLiteral(s) = self.peek().kind.clone() {
            self.advance();
            return Ok(Expr::StringLiteral(s));
        }

        if let TokenKind::Identifier(name) = self.peek().kind.clone() {
            let line = self.peek().line;
            self.advance();
            return Ok(Expr::Variable { name, line });
        }

        if self.match_token(&[TokenKind::LeftParen]) {
            let expr = self.expression()?;
            self.consume(&TokenKind::RightParen, "Expected ')' after expression")?;
            return Ok(Expr::Grouping(Box::new(expr)));
        }

        self.error("Expected expression");
        Err(())
    }

    // Helper methods

    fn match_token(&mut self, kinds: &[TokenKind]) -> bool {
        for kind in kinds {
            if self.check(kind) {
                self.advance();
                return true;
            }
        }
        false
    }

    fn check(&self, kind: &TokenKind) -> bool {
        if self.is_at_end() {
            return false;
        }
        std::mem::discriminant(&self.peek().kind) == std::mem::discriminant(kind)
    }

    fn advance(&mut self) -> &Token {
        if !self.is_at_end() {
            self.current += 1;
        }
        self.previous()
    }

    fn is_at_end(&self) -> bool {
        matches!(self.peek().kind, TokenKind::Eof)
    }

    fn peek(&self) -> &Token {
        &self.tokens[self.current]
    }

    fn previous(&self) -> &Token {
        &self.tokens[self.current - 1]
    }

    fn consume(&mut self, kind: &TokenKind, message: &str) -> Result<&Token, ()> {
        if self.check(kind) {
            Ok(self.advance())
        } else {
            self.error(message);
            Err(())
        }
    }

    fn consume_identifier(&mut self, message: &str) -> Result<Token, ()> {
        if let TokenKind::Identifier(_) = self.peek().kind {
            Ok(self.advance().clone())
        } else {
            self.error(message);
            Err(())
        }
    }

    fn error(&mut self, message: &str) {
        let token = self.peek();
        self.errors.push(ParseError {
            message: message.to_string(),
            line: token.line,
            column: token.column,
        });
    }

    fn synchronize(&mut self) {
        self.advance();

        while !self.is_at_end() {
            if matches!(self.previous().kind, TokenKind::Semicolon) {
                return;
            }

            match self.peek().kind {
                TokenKind::Fn | TokenKind::Let | TokenKind::If | TokenKind::Return => return,
                _ => {}
            }

            self.advance();
        }
    }
}
```

## Part 5: Type Checking

The type checker walks the AST and verifies that all operations are type-safe. It maintains a symbol table for variable bindings and checks that expressions have compatible types.

```rust
// src/type_checker.rs

use std::collections::HashMap;
use crate::ast::*;

pub struct TypeChecker {
    // Stack of scopes for variable bindings
    scopes: Vec<HashMap<String, Type>>,
    // Function signatures
    functions: HashMap<String, (Vec<Type>, Type)>,
    errors: Vec<TypeError>,
    current_return_type: Option<Type>,
}

#[derive(Debug, Clone)]
pub struct TypeError {
    pub message: String,
    pub line: usize,
}

impl TypeChecker {
    pub fn new() -> Self {
        TypeChecker {
            scopes: vec![HashMap::new()],
            functions: HashMap::new(),
            errors: Vec::new(),
            current_return_type: None,
        }
    }

    pub fn check(&mut self, program: &Program) -> Result<(), Vec<TypeError>> {
        // First pass: register all function signatures
        for func in &program.functions {
            let param_types: Vec<Type> = func.params.iter().map(|(_, t)| t.clone()).collect();
            self.functions.insert(
                func.name.clone(),
                (param_types, func.return_type.clone()),
            );
        }

        // Second pass: check function bodies
        for func in &program.functions {
            self.check_function(func);
        }

        // Check top-level statements
        for stmt in &program.statements {
            self.check_stmt(stmt);
        }

        if self.errors.is_empty() {
            Ok(())
        } else {
            Err(self.errors.clone())
        }
    }

    fn check_function(&mut self, func: &Function) {
        self.begin_scope();

        // Add parameters to scope
        for (name, param_type) in &func.params {
            self.define(name.clone(), param_type.clone());
        }

        self.current_return_type = Some(func.return_type.clone());

        for stmt in &func.body {
            self.check_stmt(stmt);
        }

        self.current_return_type = None;
        self.end_scope();
    }

    fn check_stmt(&mut self, stmt: &Stmt) {
        match stmt {
            Stmt::Expression(expr) => {
                self.check_expr(expr);
            }

            Stmt::Let { name, type_annotation, initializer, line } => {
                let init_type = self.check_expr(initializer);

                let var_type = if let Some(annotated) = type_annotation {
                    // Verify initializer matches annotation
                    if !self.types_compatible(annotated, &init_type) {
                        self.error(
                            *line,
                            &format!(
                                "Type mismatch: expected {:?}, found {:?}",
                                annotated, init_type
                            ),
                        );
                    }
                    annotated.clone()
                } else {
                    init_type
                };

                self.define(name.clone(), var_type);
            }

            Stmt::Return { value, line } => {
                let return_type = match value {
                    Some(expr) => self.check_expr(expr),
                    None => Type::Void,
                };

                if let Some(expected) = &self.current_return_type {
                    if !self.types_compatible(expected, &return_type) {
                        self.error(
                            *line,
                            &format!(
                                "Return type mismatch: expected {:?}, found {:?}",
                                expected, return_type
                            ),
                        );
                    }
                }
            }

            Stmt::Block(statements) => {
                self.begin_scope();
                for s in statements {
                    self.check_stmt(s);
                }
                self.end_scope();
            }
        }
    }

    fn check_expr(&mut self, expr: &Expr) -> Type {
        match expr {
            Expr::IntLiteral(_) => Type::Int,
            Expr::FloatLiteral(_) => Type::Float,
            Expr::BoolLiteral(_) => Type::Bool,
            Expr::StringLiteral(_) => Type::String,

            Expr::Variable { name, line } => {
                self.lookup(name).unwrap_or_else(|| {
                    self.error(*line, &format!("Undefined variable: {}", name));
                    Type::Unknown
                })
            }

            Expr::Binary { left, operator, right, line } => {
                let left_type = self.check_expr(left);
                let right_type = self.check_expr(right);

                self.check_binary_op(*operator, &left_type, &right_type, *line)
            }

            Expr::Unary { operator, operand, line } => {
                let operand_type = self.check_expr(operand);

                match operator {
                    UnaryOp::Negate => {
                        if !matches!(operand_type, Type::Int | Type::Float) {
                            self.error(
                                *line,
                                &format!("Cannot negate type {:?}", operand_type),
                            );
                            Type::Unknown
                        } else {
                            operand_type
                        }
                    }
                    UnaryOp::Not => {
                        if operand_type != Type::Bool {
                            self.error(
                                *line,
                                &format!("Cannot apply '!' to type {:?}", operand_type),
                            );
                            Type::Unknown
                        } else {
                            Type::Bool
                        }
                    }
                }
            }

            Expr::Call { callee, arguments, line } => {
                // For simplicity, we only handle direct function calls
                if let Expr::Variable { name, .. } = callee.as_ref() {
                    if let Some((param_types, return_type)) = self.functions.get(name).cloned() {
                        if arguments.len() != param_types.len() {
                            self.error(
                                *line,
                                &format!(
                                    "Expected {} arguments, found {}",
                                    param_types.len(),
                                    arguments.len()
                                ),
                            );
                            return Type::Unknown;
                        }

                        for (arg, expected) in arguments.iter().zip(param_types.iter()) {
                            let arg_type = self.check_expr(arg);
                            if !self.types_compatible(expected, &arg_type) {
                                self.error(
                                    *line,
                                    &format!(
                                        "Argument type mismatch: expected {:?}, found {:?}",
                                        expected, arg_type
                                    ),
                                );
                            }
                        }

                        return_type
                    } else {
                        self.error(*line, &format!("Undefined function: {}", name));
                        Type::Unknown
                    }
                } else {
                    self.error(*line, "Can only call functions by name");
                    Type::Unknown
                }
            }

            Expr::Grouping(inner) => self.check_expr(inner),

            Expr::If { condition, then_branch, else_branch, line } => {
                let cond_type = self.check_expr(condition);
                if cond_type != Type::Bool {
                    self.error(
                        *line,
                        &format!("Condition must be bool, found {:?}", cond_type),
                    );
                }

                let then_type = self.check_expr(then_branch);

                if let Some(else_expr) = else_branch {
                    let else_type = self.check_expr(else_expr);
                    if !self.types_compatible(&then_type, &else_type) {
                        self.error(
                            *line,
                            &format!(
                                "If branches have different types: {:?} and {:?}",
                                then_type, else_type
                            ),
                        );
                    }
                    then_type
                } else {
                    Type::Void
                }
            }
        }
    }

    fn check_binary_op(
        &mut self,
        op: BinaryOp,
        left: &Type,
        right: &Type,
        line: usize,
    ) -> Type {
        match op {
            // Arithmetic operators
            BinaryOp::Add | BinaryOp::Subtract | BinaryOp::Multiply |
            BinaryOp::Divide | BinaryOp::Modulo => {
                if matches!((left, right), (Type::Int, Type::Int)) {
                    Type::Int
                } else if matches!(
                    (left, right),
                    (Type::Float, Type::Float) | (Type::Int, Type::Float) | (Type::Float, Type::Int)
                ) {
                    Type::Float
                } else if matches!(op, BinaryOp::Add)
                    && matches!((left, right), (Type::String, Type::String))
                {
                    Type::String
                } else {
                    self.error(
                        line,
                        &format!(
                            "Cannot apply {:?} to {:?} and {:?}",
                            op, left, right
                        ),
                    );
                    Type::Unknown
                }
            }

            // Comparison operators
            BinaryOp::Less | BinaryOp::LessEqual |
            BinaryOp::Greater | BinaryOp::GreaterEqual => {
                if matches!(
                    (left, right),
                    (Type::Int, Type::Int) | (Type::Float, Type::Float) |
                    (Type::Int, Type::Float) | (Type::Float, Type::Int)
                ) {
                    Type::Bool
                } else {
                    self.error(
                        line,
                        &format!("Cannot compare {:?} and {:?}", left, right),
                    );
                    Type::Unknown
                }
            }

            // Equality operators
            BinaryOp::Equal | BinaryOp::NotEqual => {
                if self.types_compatible(left, right) {
                    Type::Bool
                } else {
                    self.error(
                        line,
                        &format!(
                            "Cannot compare {:?} and {:?} for equality",
                            left, right
                        ),
                    );
                    Type::Unknown
                }
            }

            // Logical operators
            BinaryOp::And | BinaryOp::Or => {
                if *left == Type::Bool && *right == Type::Bool {
                    Type::Bool
                } else {
                    self.error(
                        line,
                        &format!(
                            "Logical operators require bool operands, found {:?} and {:?}",
                            left, right
                        ),
                    );
                    Type::Unknown
                }
            }
        }
    }

    fn types_compatible(&self, expected: &Type, actual: &Type) -> bool {
        if *expected == *actual {
            return true;
        }

        // Allow int to float coercion
        if *expected == Type::Float && *actual == Type::Int {
            return true;
        }

        // Unknown is compatible with everything (error recovery)
        if *expected == Type::Unknown || *actual == Type::Unknown {
            return true;
        }

        false
    }

    fn begin_scope(&mut self) {
        self.scopes.push(HashMap::new());
    }

    fn end_scope(&mut self) {
        self.scopes.pop();
    }

    fn define(&mut self, name: String, var_type: Type) {
        if let Some(scope) = self.scopes.last_mut() {
            scope.insert(name, var_type);
        }
    }

    fn lookup(&self, name: &str) -> Option<Type> {
        for scope in self.scopes.iter().rev() {
            if let Some(var_type) = scope.get(name) {
                return Some(var_type.clone());
            }
        }
        None
    }

    fn error(&mut self, line: usize, message: &str) {
        self.errors.push(TypeError {
            message: message.to_string(),
            line,
        });
    }
}
```

## Part 6: Putting It All Together

Now let us wire everything together in our main file:

```rust
// src/main.rs

mod token;
mod lexer;
mod ast;
mod parser;
mod type_checker;

use lexer::Lexer;
use parser::Parser;
use type_checker::TypeChecker;

fn main() {
    let source = r#"
        fn add(a: int, b: int) -> int {
            return a + b;
        }

        fn main() -> int {
            let x: int = 10;
            let y = 20;
            let result = add(x, y);
            return result;
        }
    "#;

    println!("=== Source Code ===");
    println!("{}", source);

    // Lexical analysis
    println!("\n=== Lexing ===");
    let mut lexer = Lexer::new(source);
    let tokens = match lexer.tokenize() {
        Ok(tokens) => {
            println!("Lexing successful: {} tokens", tokens.len());
            tokens
        }
        Err(errors) => {
            for err in errors {
                eprintln!("Lexer error at {}:{}: {}", err.line, err.column, err.message);
            }
            return;
        }
    };

    // Parsing
    println!("\n=== Parsing ===");
    let mut parser = Parser::new(tokens);
    let program = match parser.parse() {
        Ok(program) => {
            println!("Parsing successful:");
            println!("  - {} functions", program.functions.len());
            println!("  - {} top-level statements", program.statements.len());
            program
        }
        Err(errors) => {
            for err in errors {
                eprintln!("Parse error at {}:{}: {}", err.line, err.column, err.message);
            }
            return;
        }
    };

    // Type checking
    println!("\n=== Type Checking ===");
    let mut checker = TypeChecker::new();
    match checker.check(&program) {
        Ok(()) => {
            println!("Type checking successful!");
        }
        Err(errors) => {
            for err in errors {
                eprintln!("Type error at line {}: {}", err.line, err.message);
            }
            return;
        }
    }

    println!("\n=== Compilation Successful ===");
}
```

## Error Recovery Strategies

Error recovery is important for providing multiple error messages in a single compilation pass. Our parser uses panic mode recovery, which discards tokens until it finds a synchronization point (like a semicolon or keyword).

Here is a comparison of error recovery strategies:

| Strategy | Pros | Cons |
|----------|------|------|
| Panic Mode | Simple, reliable | May miss some errors |
| Phrase Level | More errors found | Can cause cascading errors |
| Error Productions | Handles common mistakes | Grammar complexity |
| Global Correction | Optimal recovery | Very expensive |

The synchronize method in our parser implements panic mode:

```rust
fn synchronize(&mut self) {
    self.advance();

    while !self.is_at_end() {
        // Synchronize at statement boundaries
        if matches!(self.previous().kind, TokenKind::Semicolon) {
            return;
        }

        // Synchronize at declaration keywords
        match self.peek().kind {
            TokenKind::Fn | TokenKind::Let | TokenKind::If | TokenKind::Return => return,
            _ => {}
        }

        self.advance();
    }
}
```

## Testing Your Compiler Frontend

Here are some test cases to verify your implementation:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lexer_arithmetic() {
        let mut lexer = Lexer::new("1 + 2 * 3");
        let tokens = lexer.tokenize().unwrap();

        assert!(matches!(tokens[0].kind, TokenKind::Integer(1)));
        assert!(matches!(tokens[1].kind, TokenKind::Plus));
        assert!(matches!(tokens[2].kind, TokenKind::Integer(2)));
        assert!(matches!(tokens[3].kind, TokenKind::Star));
        assert!(matches!(tokens[4].kind, TokenKind::Integer(3)));
    }

    #[test]
    fn test_parser_let_statement() {
        let mut lexer = Lexer::new("let x: int = 42;");
        let tokens = lexer.tokenize().unwrap();
        let mut parser = Parser::new(tokens);
        let program = parser.parse().unwrap();

        assert_eq!(program.statements.len(), 1);
    }

    #[test]
    fn test_type_checker_mismatch() {
        let source = r#"
            fn test() -> int {
                let x: int = "hello";
                return x;
            }
        "#;

        let mut lexer = Lexer::new(source);
        let tokens = lexer.tokenize().unwrap();
        let mut parser = Parser::new(tokens);
        let program = parser.parse().unwrap();
        let mut checker = TypeChecker::new();

        assert!(checker.check(&program).is_err());
    }
}
```

## Next Steps

This compiler frontend provides a solid foundation. Here are some directions to extend it:

1. **Control Flow** - Add while loops, for loops, and break/continue statements
2. **User-Defined Types** - Support structs and enums
3. **Pattern Matching** - Implement match expressions
4. **Modules** - Add import/export for code organization
5. **Code Generation** - Output LLVM IR, WebAssembly, or bytecode

The complete source code for this project is available for reference. Each component, from the lexer to the type checker, follows Rust idioms and demonstrates how the language's type system helps prevent bugs in compiler construction.

Building compilers teaches fundamental computer science concepts and gives you deep insight into how programming languages work. The skills transfer directly to tasks like writing parsers for configuration files, domain-specific languages, and data formats.
