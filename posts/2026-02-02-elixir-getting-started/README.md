# How to Get Started with Elixir Programming

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Elixir, Functional Programming, Erlang, BEAM, Getting Started

Description: A beginner-friendly introduction to Elixir programming, covering installation, basic syntax, pattern matching, and the functional programming paradigm.

---

If you've been hearing about Elixir and wondering what the hype is about, you're in the right place. Elixir is a functional programming language built on top of the Erlang VM (called BEAM), which has powered telecom systems for decades with incredible reliability. The language gives you Erlang's battle-tested concurrency model with a modern, Ruby-like syntax that's actually pleasant to write.

I picked up Elixir a few years ago after getting frustrated with concurrency bugs in other languages. The experience was eye-opening - suddenly, building systems that handle thousands of concurrent connections felt natural rather than terrifying.

---

## Why Elixir?

Before diving into code, here's what makes Elixir stand out:

| Feature | What It Means |
|---------|---------------|
| **Fault Tolerance** | Processes are isolated - one crash doesn't take down your system |
| **Concurrency** | Lightweight processes make concurrent programming straightforward |
| **Immutability** | Data doesn't change unexpectedly, eliminating a whole class of bugs |
| **Pattern Matching** | Destructure data elegantly and write cleaner code |
| **Hot Code Swapping** | Update running systems without downtime |

---

## Installing Elixir

The easiest way to install Elixir depends on your operating system.

**macOS (using Homebrew):**

```bash
# Install Elixir (this also installs Erlang as a dependency)
brew install elixir

# Verify the installation
elixir --version
```

**Ubuntu/Debian:**

```bash
# Add the Erlang Solutions repository
wget https://packages.erlang-solutions.com/erlang-solutions_2.0_all.deb
sudo dpkg -i erlang-solutions_2.0_all.deb
sudo apt-get update

# Install Elixir
sudo apt-get install esl-erlang elixir
```

**Using asdf (recommended for managing multiple versions):**

```bash
# Install the Erlang and Elixir plugins
asdf plugin add erlang
asdf plugin add elixir

# Install specific versions
asdf install erlang 26.2
asdf install elixir 1.16.0-otp-26

# Set global versions
asdf global erlang 26.2
asdf global elixir 1.16.0-otp-26
```

Once installed, you can start the interactive shell with `iex`:

```bash
$ iex
Erlang/OTP 26 [erts-14.2] [source] [64-bit] [smp:8:8]

Interactive Elixir (1.16.0) - press Ctrl+C to exit
iex(1)>
```

---

## Basic Types

Elixir has the data types you'd expect, plus some that might be new to you.

```elixir
# Numbers - integers and floats
age = 25
pi = 3.14159

# Atoms - constants where the name is the value
# Similar to symbols in Ruby or enums in other languages
status = :ok
error = :not_found

# Strings - UTF-8 encoded binaries
name = "Elixir Developer"

# Booleans - actually just atoms
is_active = true   # same as :true
is_admin = false   # same as :false

# Lists - linked lists, good for prepending
languages = ["elixir", "erlang", "ruby"]

# Tuples - fixed-size collections, good for returning multiple values
# Convention: first element is often :ok or :error
result = {:ok, "Operation successful"}
failure = {:error, "Something went wrong"}

# Maps - key-value stores
user = %{
  name: "Alice",
  email: "alice@example.com",
  age: 30
}
```

| Type | Example | Use Case |
|------|---------|----------|
| Integer | `42` | Counting, IDs |
| Float | `3.14` | Decimal calculations |
| Atom | `:ok`, `:error` | Status codes, constants |
| String | `"hello"` | Text data |
| List | `[1, 2, 3]` | Collections that grow/shrink |
| Tuple | `{:ok, value}` | Fixed-size grouped data |
| Map | `%{key: value}` | Key-value lookups |

---

## Pattern Matching

Pattern matching is probably the most powerful feature in Elixir. The `=` operator isn't just assignment - it's pattern matching.

```elixir
# Basic pattern matching
x = 1           # Binds 1 to x
1 = x           # Matches - x is already 1
# 2 = x         # Would raise MatchError

# Destructuring tuples
{status, message} = {:ok, "Success"}
# status is now :ok
# message is now "Success"

# Matching on specific values
{:ok, result} = {:ok, 42}
# result is 42

# This would fail because the atoms don't match
# {:ok, result} = {:error, "failed"}

# Destructuring maps
%{name: user_name} = %{name: "Bob", age: 25}
# user_name is "Bob"

# Ignoring values with underscore
{_, _, third} = {1, 2, 3}
# third is 3, first two values are ignored

# Head and tail of lists
[head | tail] = [1, 2, 3, 4]
# head is 1
# tail is [2, 3, 4]
```

Pattern matching really shines in function definitions:

```elixir
defmodule Greeter do
  # Different function clauses based on pattern
  def greet(%{name: name, language: "spanish"}) do
    "Hola, #{name}!"
  end

  def greet(%{name: name, language: "french"}) do
    "Bonjour, #{name}!"
  end

  # Default case - matches any map with a name key
  def greet(%{name: name}) do
    "Hello, #{name}!"
  end
end

# Elixir picks the first matching clause
Greeter.greet(%{name: "Maria", language: "spanish"})
# Returns: "Hola, Maria!"

Greeter.greet(%{name: "Jean", language: "french"})
# Returns: "Bonjour, Jean!"

Greeter.greet(%{name: "Alice"})
# Returns: "Hello, Alice!"
```

---

## Functions and Modules

Functions in Elixir live inside modules. Here's a practical example:

```elixir
defmodule Calculator do
  # Public function - can be called from outside the module
  def add(a, b) do
    a + b
  end

  def subtract(a, b) do
    a - b
  end

  # Function with multiple clauses and guard
  def divide(_a, 0) do
    {:error, "Cannot divide by zero"}
  end

  def divide(a, b) when is_number(a) and is_number(b) do
    {:ok, a / b}
  end

  # Private function - only accessible within this module
  defp validate_number(n) when is_number(n), do: true
  defp validate_number(_), do: false
end

# Usage
Calculator.add(5, 3)       # Returns: 8
Calculator.divide(10, 2)   # Returns: {:ok, 5.0}
Calculator.divide(10, 0)   # Returns: {:error, "Cannot divide by zero"}
```

Anonymous functions are also common:

```elixir
# Anonymous function
add = fn a, b -> a + b end
add.(2, 3)  # Returns: 5 (note the dot before parentheses)

# Shorthand syntax using capture operator
multiply = &(&1 * &2)
multiply.(4, 5)  # Returns: 20
```

---

## The Pipe Operator

The pipe operator `|>` is what makes Elixir code so readable. It takes the result of the expression on the left and passes it as the first argument to the function on the right.

```elixir
# Without pipes - reads inside-out, hard to follow
result = String.upcase(String.trim("  hello world  "))

# With pipes - reads left to right, like a pipeline
result = "  hello world  "
         |> String.trim()
         |> String.upcase()
# result is "HELLO WORLD"

# Real-world example: processing user data
defmodule UserProcessor do
  def process(raw_input) do
    raw_input
    |> parse_json()
    |> validate_fields()
    |> normalize_email()
    |> save_to_database()
  end

  defp parse_json(input), do: Jason.decode!(input)
  defp validate_fields(data), do: # validation logic
  defp normalize_email(data), do: %{data | email: String.downcase(data.email)}
  defp save_to_database(data), do: # save logic
end
```

---

## Introduction to Processes

Elixir processes are lightweight and isolated. They're not OS processes - you can spin up millions of them. Here's a taste:

```elixir
# Spawn a new process that prints a message
spawn(fn ->
  IO.puts("Hello from a separate process!")
end)

# Processes communicate via messages
defmodule Counter do
  def start(initial_count) do
    spawn(fn -> loop(initial_count) end)
  end

  defp loop(count) do
    receive do
      :increment ->
        IO.puts("Count is now: #{count + 1}")
        loop(count + 1)

      :get ->
        IO.puts("Current count: #{count}")
        loop(count)

      {:set, new_count} ->
        IO.puts("Setting count to: #{new_count}")
        loop(new_count)
    end
  end
end

# Usage
pid = Counter.start(0)    # Start counter at 0
send(pid, :increment)      # Count is now: 1
send(pid, :increment)      # Count is now: 2
send(pid, :get)            # Current count: 2
send(pid, {:set, 10})      # Setting count to: 10
```

This is just scratching the surface. In production, you'd use GenServer and supervision trees to build fault-tolerant systems, but this gives you the basic idea.

---

## Next Steps

You've got the basics down. Here's where to go from here:

1. **Build something** - Create a small CLI tool or web app with Phoenix
2. **Learn OTP** - Understand GenServer, Supervisors, and the "let it crash" philosophy
3. **Explore Mix** - Elixir's build tool for creating and managing projects
4. **Read the guides** - The official Elixir guides at elixir-lang.org are excellent

Elixir has a welcoming community and solid documentation. The learning curve for functional programming is real, but once it clicks, you'll wonder how you ever built concurrent systems without it.
