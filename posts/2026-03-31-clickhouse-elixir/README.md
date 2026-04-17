# How to Use ClickHouse with Elixir

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Elixir, HTTP Client, Analytics, Phoenix

Description: Query ClickHouse from Elixir using the HTTP API with Req or HTTPoison, and integrate analytics queries into Phoenix applications.

---

## Approach

ClickHouse exposes an HTTP interface on port 8123, making it easy to integrate with any HTTP client. Elixir does not have an official ClickHouse driver, so we use the HTTP API directly with `Req` (recommended) or `HTTPoison`.

## Adding Dependencies

```elixir
# mix.exs
defp deps do
  [
    {:req, "~> 0.4"},
    {:jason, "~> 1.4"}
  ]
end
```

## ClickHouse Module

```elixir
defmodule MyApp.ClickHouse do
  @base_url Application.compile_env(:my_app, :clickhouse_url, "http://localhost:8123")
  @database Application.compile_env(:my_app, :clickhouse_db, "analytics")

  def query(sql) do
    Req.post!(
      @base_url,
      params: [database: @database, default_format: "JSONEachRow"],
      body: sql,
      headers: [
        {"X-ClickHouse-User", "default"},
        {"X-ClickHouse-Key", ""}
      ]
    )
    |> handle_response()
  end

  defp handle_response(%{status: 200, body: body}) do
    rows =
      body
      |> String.split("\n", trim: true)
      |> Enum.map(&Jason.decode!/1)
    {:ok, rows}
  end
  defp handle_response(%{status: status, body: body}) do
    {:error, "ClickHouse error #{status}: #{body}"}
  end
end
```

## Running a Query

```elixir
{:ok, rows} = MyApp.ClickHouse.query("""
  SELECT event_name, count() AS cnt
  FROM events
  WHERE toDate(ts) >= today() - 7
  GROUP BY event_name
  ORDER BY cnt DESC
  LIMIT 10
""")

Enum.each(rows, fn %{"event_name" => name, "cnt" => cnt} ->
  IO.puts("#{name}: #{cnt}")
end)
```

## Inserting Data

```elixir
def insert(table, rows) do
  body =
    rows
    |> Enum.map(&Jason.encode!/1)
    |> Enum.join("\n")

  Req.post!(
    @base_url,
    params: [query: "INSERT INTO #{table} FORMAT JSONEachRow", database: @database],
    body: body,
    headers: [{"X-ClickHouse-User", "default"}, {"X-ClickHouse-Key", ""}]
  )
end
```

## Phoenix Controller Integration

```elixir
defmodule MyAppWeb.AnalyticsController do
  use MyAppWeb, :controller

  def top_events(conn, %{"days" => days}) do
    days = String.to_integer(days)
    sql = "SELECT event_name, count() AS cnt FROM events
           WHERE ts >= now() - INTERVAL #{days} DAY
           GROUP BY event_name ORDER BY cnt DESC LIMIT 20"

    case MyApp.ClickHouse.query(sql) do
      {:ok, rows} -> json(conn, rows)
      {:error, msg} -> conn |> put_status(500) |> json(%{error: msg})
    end
  end
end
```

## Caching with Cachex

```elixir
def cached_top_events(days) do
  Cachex.fetch(:ch_cache, "top_events_#{days}", fn _key ->
    {:commit, MyApp.ClickHouse.query("SELECT event_name, count() FROM events ..."),
     expire: :timer.seconds(30)}
  end)
end
```

## Summary

Elixir integrates with ClickHouse via the HTTP API using `Req`. Wrap query and insert logic in a dedicated module, use `Jason` for JSON parsing, and cache results with `Cachex` to reduce ClickHouse load in Phoenix applications.
