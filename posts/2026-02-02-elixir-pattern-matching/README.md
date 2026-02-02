# How to Use Pattern Matching in Elixir

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Elixir, Pattern Matching, Functional Programming, Destructuring, BEAM

Description: Master Elixir's powerful pattern matching capabilities for destructuring, function clauses, case expressions, and elegant control flow.

---

> Pattern matching is not just a feature in Elixir - it's the foundation of how you write code in this language. Once you understand it, you'll wonder how you ever lived without it.

If you're coming from languages like JavaScript, Python, or Ruby, pattern matching might feel strange at first. In most languages, the `=` operator means "assign this value to that variable." In Elixir, it means something more powerful: "make the left side match the right side."

---

## What is Pattern Matching?

In Elixir, the `=` operator is called the match operator. It doesn't just assign values - it matches patterns against data structures and binds variables along the way.

```elixir
# This isn't assignment - it's a match
x = 1
# x is bound to 1 because the pattern "x" matches the value 1

# This works because both sides match
1 = x
# Returns 1

# This fails because the pattern doesn't match
2 = x
# ** (MatchError) no match of right hand side value: 1
```

The match operator tries to make the left side equal to the right side. If it can't, you get a MatchError.

---

## Basic Pattern Matching

Here's a quick reference for common patterns:

| Pattern | Matches | Example |
|---------|---------|---------|
| `x` | Any value, binds to x | `x = 42` |
| `_` | Any value, discards it | `{_, second} = {1, 2}` |
| `^x` | Exactly the value of x | `^x = 42` (if x is 42) |
| `[h \| t]` | Non-empty list | `[first \| rest] = [1, 2, 3]` |
| `{a, b}` | Two-element tuple | `{status, value} = {:ok, 100}` |
| `%{key: val}` | Map with key | `%{name: n} = %{name: "Joe"}` |

---

## Tuple Destructuring

Tuples are everywhere in Elixir, especially for function returns. Pattern matching makes extracting values clean and readable.

```elixir
# Basic tuple destructuring
{status, message} = {:ok, "User created"}
# status = :ok
# message = "User created"

# Handling function results - common pattern in Elixir
case File.read("config.json") do
  {:ok, contents} ->
    # File was read successfully
    IO.puts("Got #{byte_size(contents)} bytes")

  {:error, reason} ->
    # Something went wrong
    IO.puts("Failed to read file: #{reason}")
end

# Nested tuple destructuring
{{year, month, day}, {hour, minute, second}} = :calendar.local_time()
# Extracts all date and time components in one line
IO.puts("Current time: #{year}-#{month}-#{day} #{hour}:#{minute}:#{second}")
```

---

## List Destructuring

Lists in Elixir are linked lists. The `[head | tail]` syntax lets you split them apart.

```elixir
# Extract the first element
[first | rest] = [1, 2, 3, 4, 5]
# first = 1
# rest = [2, 3, 4, 5]

# Extract multiple elements
[a, b, c | remaining] = [1, 2, 3, 4, 5]
# a = 1, b = 2, c = 3
# remaining = [4, 5]

# Match exact list structure
[x, y, z] = [10, 20, 30]
# x = 10, y = 20, z = 30

# This fails - different lengths
[x, y] = [1, 2, 3]
# ** (MatchError) no match of right hand side value: [1, 2, 3]
```

A practical example - processing a CSV header:

```elixir
# Parse CSV with header row
def parse_csv(file_contents) do
  [header_line | data_lines] = String.split(file_contents, "\n", trim: true)

  headers = String.split(header_line, ",")

  Enum.map(data_lines, fn line ->
    values = String.split(line, ",")
    Enum.zip(headers, values) |> Map.new()
  end)
end

# Usage
csv = """
name,email,age
Alice,alice@example.com,30
Bob,bob@example.com,25
"""

parse_csv(csv)
# [%{"age" => "30", "email" => "alice@example.com", "name" => "Alice"},
#  %{"age" => "25", "email" => "bob@example.com", "name" => "Bob"}]
```

---

## Map Pattern Matching

Maps are matched by keys, not by exact structure. This is different from tuples and lists.

```elixir
# Match specific keys - other keys are ignored
%{name: user_name, email: user_email} = %{
  name: "Alice",
  email: "alice@example.com",
  role: "admin",
  created_at: ~D[2024-01-15]
}
# user_name = "Alice"
# user_email = "alice@example.com"
# role and created_at are ignored

# This works - we only need the keys we specify
%{id: id} = %{id: 42, name: "Test", active: true}
# id = 42

# Empty map matches any map
%{} = %{foo: "bar", baz: 123}
# Matches!

# Nested map matching
user = %{
  profile: %{
    settings: %{
      theme: "dark",
      notifications: true
    }
  }
}

%{profile: %{settings: %{theme: theme}}} = user
# theme = "dark"
```

---

## Function Clause Pattern Matching

This is where pattern matching really shines. You can define multiple function clauses that handle different patterns.

```elixir
defmodule PaymentProcessor do
  # Handle credit card payments
  def process(%{type: "credit_card", card_number: card, amount: amount}) do
    # Validate and charge the card
    IO.puts("Charging #{amount} to card ending in #{String.slice(card, -4..-1)}")
    {:ok, "Payment processed"}
  end

  # Handle PayPal payments
  def process(%{type: "paypal", email: email, amount: amount}) do
    IO.puts("Sending PayPal request to #{email} for #{amount}")
    {:ok, "PayPal payment initiated"}
  end

  # Handle bank transfers
  def process(%{type: "bank_transfer", account: acc, routing: routing, amount: amount}) do
    IO.puts("Initiating transfer of #{amount} to account #{acc}")
    {:ok, "Bank transfer scheduled"}
  end

  # Catch-all for unknown payment types
  def process(%{type: type}) do
    {:error, "Unknown payment type: #{type}"}
  end

  # Handle completely malformed input
  def process(_invalid) do
    {:error, "Invalid payment data"}
  end
end

# Each call routes to the right function clause automatically
PaymentProcessor.process(%{type: "credit_card", card_number: "4111111111111111", amount: 99.99})
# Charging 99.99 to card ending in 1111
# {:ok, "Payment processed"}

PaymentProcessor.process(%{type: "crypto", wallet: "abc123", amount: 50})
# {:error, "Unknown payment type: crypto"}
```

---

## Guards for Extra Conditions

Sometimes patterns aren't enough. Guards let you add boolean conditions to your matches.

```elixir
defmodule Pricing do
  # Free tier - up to 1000 requests
  def calculate_cost(requests) when requests <= 1000 do
    0
  end

  # Standard tier - $0.001 per request after free tier
  def calculate_cost(requests) when requests <= 100_000 do
    (requests - 1000) * 0.001
  end

  # Enterprise tier - volume discount kicks in
  def calculate_cost(requests) when requests > 100_000 do
    99 + (requests - 100_000) * 0.0005
  end
end

Pricing.calculate_cost(500)      # 0
Pricing.calculate_cost(5000)     # 4.0
Pricing.calculate_cost(200_000)  # 149.0
```

Common guard functions include `is_integer/1`, `is_binary/1`, `is_list/1`, `is_map/1`, `length/1`, `map_size/1`, and comparison operators.

---

## The Pin Operator

By default, variables on the left side of a match get rebound. The pin operator `^` prevents this - it uses the variable's current value instead.

```elixir
x = 1
x = 2  # x is rebound to 2

# With pin operator
x = 1
^x = 1  # Matches! x is still 1
^x = 2  # ** (MatchError) - 2 doesn't match 1
```

This is useful when matching against known values:

```elixir
defmodule UserLookup do
  def find_by_id(users, target_id) do
    Enum.find(users, fn %{id: id} -> id == target_id end)
  end

  # Using pin in pattern matching
  def find_by_id_v2(users, target_id) do
    Enum.find(users, fn
      %{id: ^target_id} -> true  # Pin matches against target_id's value
      _ -> false
    end)
  end
end
```

---

## Case Expressions

The `case` expression lets you pattern match against multiple possibilities.

```elixir
def handle_response(response) do
  case response do
    {:ok, %{status: 200, body: body}} ->
      {:success, Jason.decode!(body)}

    {:ok, %{status: 404}} ->
      {:not_found, nil}

    {:ok, %{status: status}} when status >= 500 ->
      {:server_error, "Server returned #{status}"}

    {:error, %{reason: :timeout}} ->
      {:retry, "Request timed out"}

    {:error, reason} ->
      {:failure, inspect(reason)}
  end
end
```

---

## Wrapping Up

Pattern matching changes how you think about writing code. Instead of checking types and extracting values with method calls, you declare what shape you expect and let Elixir do the work.

Key takeaways:
- The `=` operator matches patterns, not just assigns values
- Use `_` to ignore values you don't need
- Use `^` to match against existing variable values
- Multiple function clauses let you handle different cases cleanly
- Guards add boolean conditions when patterns aren't enough

Start using pattern matching in your next Elixir project. Once it clicks, you'll find yourself writing cleaner, more declarative code with less defensive programming.
