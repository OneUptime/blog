# How to Parse Time Strings and Durations in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Time, Date, Parsing, Duration, RFC3339

Description: Learn how to parse time strings and durations in Go using time.Parse, time.ParseDuration, and common format layouts including RFC3339 and custom formats.

---

Time parsing in Go is different from other languages. Go uses a reference time instead of format codes like `%Y-%m-%d`. Understanding this concept is key to working with dates and times.

---

## The Reference Time

Go uses a specific reference time that you arrange into your desired format:

```
Mon Jan 2 15:04:05 MST 2006
```

This is January 2, 2006 at 3:04:05 PM MST. The numbers are significant:

| Component | Value | Meaning |
|-----------|-------|---------|
| Month | 01 or Jan | 1 = January |
| Day | 02 | 2nd day |
| Hour | 15 | 3 PM (24-hour) |
| Minute | 04 | 4 minutes |
| Second | 05 | 5 seconds |
| Year | 2006 | Year |
| Timezone | MST or -0700 | Mountain Standard Time |

---

## Basic Time Parsing

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    // Parse RFC3339 format (most common for APIs)
    t1, err := time.Parse(time.RFC3339, "2024-01-15T14:30:00Z")
    if err != nil {
        panic(err)
    }
    fmt.Println("RFC3339:", t1)
    
    // Parse custom format
    t2, err := time.Parse("2006-01-02", "2024-01-15")
    if err != nil {
        panic(err)
    }
    fmt.Println("Date only:", t2)
    
    // Parse with time
    t3, err := time.Parse("2006-01-02 15:04:05", "2024-01-15 14:30:00")
    if err != nil {
        panic(err)
    }
    fmt.Println("Date and time:", t3)
    
    // Parse US format
    t4, err := time.Parse("01/02/2006", "01/15/2024")
    if err != nil {
        panic(err)
    }
    fmt.Println("US format:", t4)
}
```

---

## Common Format Layouts

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    now := time.Now()
    
    // Built-in layouts
    fmt.Println("RFC3339:    ", now.Format(time.RFC3339))
    fmt.Println("RFC3339Nano:", now.Format(time.RFC3339Nano))
    fmt.Println("RFC1123:    ", now.Format(time.RFC1123))
    fmt.Println("RFC822:     ", now.Format(time.RFC822))
    fmt.Println("Kitchen:    ", now.Format(time.Kitchen))
    
    // Custom layouts
    fmt.Println("ISO Date:   ", now.Format("2006-01-02"))
    fmt.Println("US Date:    ", now.Format("01/02/2006"))
    fmt.Println("EU Date:    ", now.Format("02/01/2006"))
    fmt.Println("DateTime:   ", now.Format("2006-01-02 15:04:05"))
    fmt.Println("12-hour:    ", now.Format("3:04 PM"))
    fmt.Println("Full:       ", now.Format("Monday, January 2, 2006"))
}
```

**Output:**
```
RFC3339:     2024-01-15T14:30:00-07:00
RFC3339Nano: 2024-01-15T14:30:00.123456789-07:00
RFC1123:     Mon, 15 Jan 2024 14:30:00 MST
RFC822:      15 Jan 24 14:30 MST
Kitchen:     2:30PM
ISO Date:    2024-01-15
US Date:     01/15/2024
EU Date:     15/01/2024
DateTime:    2024-01-15 14:30:00
12-hour:     2:30 PM
Full:        Monday, January 15, 2024
```

---

## Parsing with Timezone

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    // UTC time
    t1, _ := time.Parse(time.RFC3339, "2024-01-15T14:30:00Z")
    fmt.Println("UTC:", t1)
    
    // With timezone offset
    t2, _ := time.Parse(time.RFC3339, "2024-01-15T14:30:00-05:00")
    fmt.Println("EST:", t2)
    
    // Parse in specific location
    loc, _ := time.LoadLocation("America/New_York")
    t3, _ := time.ParseInLocation("2006-01-02 15:04:05", "2024-01-15 14:30:00", loc)
    fmt.Println("New York:", t3)
    
    // Parse numeric timezone offset
    t4, _ := time.Parse("2006-01-02 15:04:05 -0700", "2024-01-15 14:30:00 -0500")
    fmt.Println("With offset:", t4)
    
    // Parse timezone abbreviation (less reliable)
    t5, _ := time.Parse("2006-01-02 15:04:05 MST", "2024-01-15 14:30:00 EST")
    fmt.Println("With abbrev:", t5)
}
```

---

## Parsing Durations

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    // Valid duration strings
    d1, _ := time.ParseDuration("1h30m")
    fmt.Println("1h30m:", d1)
    
    d2, _ := time.ParseDuration("2h45m30s")
    fmt.Println("2h45m30s:", d2)
    
    d3, _ := time.ParseDuration("100ms")
    fmt.Println("100ms:", d3)
    
    d4, _ := time.ParseDuration("1.5h")
    fmt.Println("1.5h:", d4)
    
    d5, _ := time.ParseDuration("-30m")  // Negative duration
    fmt.Println("-30m:", d5)
    
    // Duration units
    fmt.Println("\nDuration units:")
    units := []string{"1ns", "1us", "1ms", "1s", "1m", "1h"}
    for _, u := range units {
        d, _ := time.ParseDuration(u)
        fmt.Printf("%s = %d nanoseconds\n", u, d.Nanoseconds())
    }
}
```

**Output:**
```
1h30m: 1h30m0s
2h45m30s: 2h45m30s
100ms: 100ms
1.5h: 1h30m0s
-30m: -30m0s

Duration units:
1ns = 1 nanoseconds
1us = 1000 nanoseconds
1ms = 1000000 nanoseconds
1s = 1000000000 nanoseconds
1m = 60000000000 nanoseconds
1h = 3600000000000 nanoseconds
```

---

## Common Parsing Errors

### Error 1: Wrong Format Layout

```go
// WRONG: Using actual date values in layout
t, err := time.Parse("2024-01-15", "2024-01-15")  // ERROR!
// parsing time "2024-01-15": month out of range

// CORRECT: Use reference date
t, err := time.Parse("2006-01-02", "2024-01-15")
```

### Error 2: Mismatched Components

```go
// WRONG: Layout doesn't match input
t, err := time.Parse("2006-01-02", "01/15/2024")  // ERROR!
// parsing time "01/15/2024" as "2006-01-02": cannot parse...

// CORRECT: Match the actual format
t, err := time.Parse("01/02/2006", "01/15/2024")
```

### Error 3: Missing Timezone

```go
// Input has timezone but layout doesn't
t, err := time.Parse("2006-01-02 15:04:05", "2024-01-15 14:30:00+05:00")
// ERROR: extra text after time

// CORRECT: Include timezone in layout
t, err := time.Parse("2006-01-02 15:04:05-07:00", "2024-01-15 14:30:00+05:00")
```

---

## Flexible Time Parser

Handle multiple formats:

```go
package main

import (
    "fmt"
    "time"
)

var timeFormats = []string{
    time.RFC3339,
    time.RFC3339Nano,
    "2006-01-02T15:04:05",
    "2006-01-02 15:04:05",
    "2006-01-02",
    "01/02/2006",
    "02/01/2006",
    "Jan 2, 2006",
    "January 2, 2006",
}

func ParseFlexible(input string) (time.Time, error) {
    for _, format := range timeFormats {
        t, err := time.Parse(format, input)
        if err == nil {
            return t, nil
        }
    }
    return time.Time{}, fmt.Errorf("unable to parse time: %s", input)
}

func main() {
    inputs := []string{
        "2024-01-15T14:30:00Z",
        "2024-01-15 14:30:00",
        "2024-01-15",
        "01/15/2024",
        "January 15, 2024",
    }
    
    for _, input := range inputs {
        t, err := ParseFlexible(input)
        if err != nil {
            fmt.Printf("Error parsing %q: %v\n", input, err)
            continue
        }
        fmt.Printf("%q -> %v\n", input, t)
    }
}
```

---

## Duration Arithmetic

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    now := time.Now()
    
    // Add duration to time
    oneHourLater := now.Add(time.Hour)
    fmt.Println("1 hour later:", oneHourLater)
    
    // Subtract duration
    oneHourAgo := now.Add(-time.Hour)
    fmt.Println("1 hour ago:", oneHourAgo)
    
    // Add multiple units
    later := now.Add(2*time.Hour + 30*time.Minute + 15*time.Second)
    fmt.Println("2h30m15s later:", later)
    
    // Calculate duration between times
    start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
    end := time.Date(2024, 1, 15, 12, 30, 0, 0, time.UTC)
    
    duration := end.Sub(start)
    fmt.Println("Duration:", duration)
    fmt.Println("Hours:", duration.Hours())
    fmt.Println("Minutes:", duration.Minutes())
    
    // Since and Until
    past := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
    future := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
    
    fmt.Println("Time since:", time.Since(past))
    fmt.Println("Time until:", time.Until(future))
}
```

---

## Parsing Unix Timestamps

```go
package main

import (
    "fmt"
    "strconv"
    "time"
)

func main() {
    // Unix seconds
    ts := int64(1705334400)
    t1 := time.Unix(ts, 0)
    fmt.Println("Unix seconds:", t1)
    
    // Unix milliseconds
    tsMs := int64(1705334400000)
    t2 := time.UnixMilli(tsMs)
    fmt.Println("Unix millis:", t2)
    
    // Unix nanoseconds
    tsNs := int64(1705334400000000000)
    t3 := time.Unix(0, tsNs)
    fmt.Println("Unix nanos:", t3)
    
    // Parse string timestamp
    tsStr := "1705334400"
    ts, _ = strconv.ParseInt(tsStr, 10, 64)
    t4 := time.Unix(ts, 0)
    fmt.Println("From string:", t4)
    
    // Convert back to Unix
    now := time.Now()
    fmt.Println("Current Unix:", now.Unix())
    fmt.Println("Current UnixMilli:", now.UnixMilli())
    fmt.Println("Current UnixNano:", now.UnixNano())
}
```

---

## Format Reference Table

| Component | Layout | Example |
|-----------|--------|---------|
| Year (4 digit) | 2006 | 2024 |
| Year (2 digit) | 06 | 24 |
| Month (number) | 01 or 1 | 01 or 1 |
| Month (name) | Jan or January | Jan or January |
| Day | 02 or 2 | 15 or 15 |
| Weekday | Mon or Monday | Mon or Monday |
| Hour (24h) | 15 | 14 |
| Hour (12h) | 03 or 3 | 02 or 2 |
| AM/PM | PM | PM |
| Minute | 04 | 30 |
| Second | 05 | 45 |
| Milliseconds | .000 | .123 |
| Microseconds | .000000 | .123456 |
| Nanoseconds | .000000000 | .123456789 |
| Timezone | MST | EST |
| Offset | -0700 | -0500 |
| Offset with colon | -07:00 | -05:00 |

---

## Summary

**Parsing Time:**
- Use Go's reference time: `Mon Jan 2 15:04:05 MST 2006`
- Match layout exactly to input format
- Use `ParseInLocation` for timezone-aware parsing
- Use built-in constants like `time.RFC3339` when possible

**Parsing Durations:**
- Use `time.ParseDuration` with strings like `1h30m`, `100ms`
- Supported units: `ns`, `us`/`µs`, `ms`, `s`, `m`, `h`
- No days or larger units - calculate manually

**Common Gotchas:**
- Don't use actual dates in format strings
- Remember month is 01, day is 02, year is 2006
- 15 is for 24-hour time, 03 for 12-hour
- Always handle parsing errors

---

*Monitoring time-sensitive applications? [OneUptime](https://oneuptime.com) provides precise timing metrics and alerting to help you track time-based SLAs.*
