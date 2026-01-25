# How to Handle Dates and Times in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, datetime, Time Zones, Date Parsing, Timestamps

Description: Master Python's datetime module for handling dates, times, and time zones. Learn parsing, formatting, arithmetic, and best practices for production applications.

---

> Time handling is one of those things that seems simple until it is not. Between time zones, daylight saving, leap years, and format variations, dates and times in programming can quickly become a minefield. This guide will help you navigate Python's datetime ecosystem with confidence.

Python's `datetime` module is part of the standard library and provides classes for working with dates and times. For more complex operations like time zone handling, the `pytz` or `zoneinfo` libraries fill in the gaps.

---

## The datetime Module Basics

Python has several classes for representing dates and times:

```python
from datetime import date, time, datetime, timedelta

# date - just a date (year, month, day)
today = date.today()
print(today)  # 2024-03-15

# time - just a time (hour, minute, second, microsecond)
current_time = time(14, 30, 45)
print(current_time)  # 14:30:45

# datetime - both date and time combined
now = datetime.now()
print(now)  # 2024-03-15 14:30:45.123456

# timedelta - a duration
one_week = timedelta(weeks=1)
print(one_week)  # 7 days, 0:00:00
```

### Creating Specific Dates

```python
from datetime import datetime, date

# Create a specific date
birthday = date(1990, 5, 15)
print(birthday)  # 1990-05-15

# Create a specific datetime
event_time = datetime(2024, 12, 31, 23, 59, 59)
print(event_time)  # 2024-12-31 23:59:59

# Access components
print(f"Year: {event_time.year}")
print(f"Month: {event_time.month}")
print(f"Day: {event_time.day}")
print(f"Hour: {event_time.hour}")
print(f"Minute: {event_time.minute}")
print(f"Weekday: {event_time.weekday()}")  # 0=Monday, 6=Sunday
```

---

## Parsing Dates from Strings

The `strptime()` method parses strings into datetime objects:

```python
from datetime import datetime

# Parse a date string
date_str = "2024-03-15"
parsed = datetime.strptime(date_str, "%Y-%m-%d")
print(parsed)  # 2024-03-15 00:00:00

# Parse date and time
datetime_str = "15/03/2024 14:30:45"
parsed = datetime.strptime(datetime_str, "%d/%m/%Y %H:%M:%S")
print(parsed)  # 2024-03-15 14:30:45

# Common format codes:
# %Y - 4-digit year (2024)
# %y - 2-digit year (24)
# %m - Month as zero-padded number (03)
# %d - Day as zero-padded number (15)
# %H - Hour in 24-hour format (14)
# %I - Hour in 12-hour format (02)
# %M - Minute (30)
# %S - Second (45)
# %p - AM/PM
# %B - Full month name (March)
# %b - Abbreviated month name (Mar)
# %A - Full weekday name (Friday)
# %a - Abbreviated weekday name (Fri)
```

### Handling Multiple Date Formats

```python
from datetime import datetime

def parse_date(date_string):
    """Try multiple formats to parse a date string."""

    formats = [
        "%Y-%m-%d",           # 2024-03-15
        "%d/%m/%Y",           # 15/03/2024
        "%m/%d/%Y",           # 03/15/2024
        "%d-%b-%Y",           # 15-Mar-2024
        "%B %d, %Y",          # March 15, 2024
        "%Y-%m-%dT%H:%M:%S",  # 2024-03-15T14:30:45
        "%Y-%m-%d %H:%M:%S",  # 2024-03-15 14:30:45
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_string, fmt)
        except ValueError:
            continue

    raise ValueError(f"Unable to parse date: {date_string}")

# Test with various formats
print(parse_date("2024-03-15"))
print(parse_date("March 15, 2024"))
print(parse_date("15/03/2024"))
```

### Using dateutil for Flexible Parsing

The `python-dateutil` library handles many formats automatically:

```python
# Install: pip install python-dateutil
from dateutil import parser

# Automatic format detection
dates = [
    "2024-03-15",
    "March 15, 2024",
    "15/03/2024",
    "Mar 15 2024 2:30 PM",
    "2024-03-15T14:30:45Z",
]

for date_str in dates:
    parsed = parser.parse(date_str)
    print(f"{date_str:25} -> {parsed}")
```

---

## Formatting Dates as Strings

The `strftime()` method formats datetime objects as strings:

```python
from datetime import datetime

now = datetime.now()

# Different format examples
print(now.strftime("%Y-%m-%d"))             # 2024-03-15
print(now.strftime("%d/%m/%Y"))             # 15/03/2024
print(now.strftime("%B %d, %Y"))            # March 15, 2024
print(now.strftime("%A, %B %d, %Y"))        # Friday, March 15, 2024
print(now.strftime("%H:%M:%S"))             # 14:30:45
print(now.strftime("%I:%M %p"))             # 02:30 PM
print(now.strftime("%Y-%m-%dT%H:%M:%SZ"))   # ISO format: 2024-03-15T14:30:45Z

# For ISO format, you can also use isoformat()
print(now.isoformat())  # 2024-03-15T14:30:45.123456
```

---

## Date Arithmetic with timedelta

The `timedelta` class represents durations and enables date arithmetic:

```python
from datetime import datetime, timedelta

now = datetime.now()

# Add time
tomorrow = now + timedelta(days=1)
next_week = now + timedelta(weeks=1)
in_two_hours = now + timedelta(hours=2)
in_90_minutes = now + timedelta(minutes=90)

# Subtract time
yesterday = now - timedelta(days=1)
last_month_approx = now - timedelta(days=30)

# Combine multiple units
future = now + timedelta(days=5, hours=3, minutes=30)

print(f"Now: {now}")
print(f"Tomorrow: {tomorrow}")
print(f"In 90 minutes: {in_90_minutes}")
```

### Calculating Differences Between Dates

```python
from datetime import datetime, date

# Difference between two dates
start = datetime(2024, 1, 1)
end = datetime(2024, 3, 15)

difference = end - start
print(f"Days between: {difference.days}")  # 74
print(f"Total seconds: {difference.total_seconds()}")

# Days until an event
today = date.today()
new_year = date(today.year + 1, 1, 1)
days_until = (new_year - today).days
print(f"Days until New Year: {days_until}")

# Age calculation
birth_date = date(1990, 5, 15)
today = date.today()
age = today.year - birth_date.year

# Adjust if birthday has not occurred this year
if (today.month, today.day) < (birth_date.month, birth_date.day):
    age -= 1

print(f"Age: {age} years")
```

---

## Working with Time Zones

Time zones are where datetime handling gets tricky. Python 3.9+ includes `zoneinfo`:

```python
from datetime import datetime
from zoneinfo import ZoneInfo

# Create timezone-aware datetime
utc_now = datetime.now(ZoneInfo("UTC"))
print(f"UTC: {utc_now}")

# Convert to different time zones
ny_time = utc_now.astimezone(ZoneInfo("America/New_York"))
london_time = utc_now.astimezone(ZoneInfo("Europe/London"))
tokyo_time = utc_now.astimezone(ZoneInfo("Asia/Tokyo"))

print(f"New York: {ny_time}")
print(f"London: {london_time}")
print(f"Tokyo: {tokyo_time}")
```

### Converting Naive to Aware Datetimes

```python
from datetime import datetime
from zoneinfo import ZoneInfo

# Naive datetime (no timezone info)
naive = datetime(2024, 3, 15, 14, 30)
print(f"Naive: {naive}, tzinfo: {naive.tzinfo}")  # tzinfo: None

# Make it timezone-aware
# Option 1: Use replace() when you know the timezone
aware = naive.replace(tzinfo=ZoneInfo("America/New_York"))
print(f"Aware: {aware}")

# Option 2: Use localize with pytz (handles DST correctly)
import pytz
eastern = pytz.timezone("America/New_York")
aware = eastern.localize(naive)
print(f"Aware (pytz): {aware}")
```

### Best Practice: Store in UTC

```python
from datetime import datetime
from zoneinfo import ZoneInfo

def to_utc(dt, source_tz="America/New_York"):
    """Convert a datetime to UTC for storage."""
    if dt.tzinfo is None:
        # Assume source timezone for naive datetime
        dt = dt.replace(tzinfo=ZoneInfo(source_tz))
    return dt.astimezone(ZoneInfo("UTC"))

def from_utc(dt, target_tz="America/New_York"):
    """Convert UTC datetime to local timezone for display."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(ZoneInfo(target_tz))

# Store in UTC
local_time = datetime(2024, 3, 15, 14, 30)
utc_time = to_utc(local_time)
print(f"Stored (UTC): {utc_time}")

# Display in user's timezone
displayed = from_utc(utc_time, "Asia/Tokyo")
print(f"Displayed (Tokyo): {displayed}")
```

---

## Unix Timestamps

Unix timestamps are seconds since January 1, 1970 UTC:

```python
from datetime import datetime
import time

# Current timestamp
current_timestamp = time.time()
print(f"Current timestamp: {current_timestamp}")

# datetime to timestamp
dt = datetime(2024, 3, 15, 14, 30, 0)
timestamp = dt.timestamp()
print(f"Timestamp: {timestamp}")

# Timestamp to datetime
dt_from_timestamp = datetime.fromtimestamp(timestamp)
print(f"From timestamp: {dt_from_timestamp}")

# UTC timestamp
utc_dt = datetime.utcfromtimestamp(timestamp)
print(f"UTC from timestamp: {utc_dt}")
```

---

## Common Datetime Operations

### Find Start/End of Day, Month, Year

```python
from datetime import datetime, time

now = datetime.now()

# Start of day
start_of_day = datetime.combine(now.date(), time.min)
print(f"Start of day: {start_of_day}")  # 2024-03-15 00:00:00

# End of day
end_of_day = datetime.combine(now.date(), time.max)
print(f"End of day: {end_of_day}")  # 2024-03-15 23:59:59.999999

# Start of month
start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
print(f"Start of month: {start_of_month}")

# Start of year
start_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
print(f"Start of year: {start_of_year}")
```

### Generate Date Ranges

```python
from datetime import datetime, timedelta

def date_range(start, end, step=timedelta(days=1)):
    """Generate dates between start and end."""
    current = start
    while current <= end:
        yield current
        current += step

# Generate dates for a week
start = datetime(2024, 3, 1)
end = datetime(2024, 3, 7)

for dt in date_range(start, end):
    print(dt.strftime("%Y-%m-%d %A"))
```

### Check if Date is Weekend

```python
from datetime import datetime

def is_weekend(dt):
    """Check if date falls on weekend."""
    # weekday(): 0=Monday, 6=Sunday
    return dt.weekday() >= 5

today = datetime.now()
print(f"Is weekend: {is_weekend(today)}")
```

---

## Working with Months and Years

Adding months is not straightforward due to varying month lengths:

```python
from datetime import datetime
from dateutil.relativedelta import relativedelta

now = datetime.now()

# Add months (using dateutil)
next_month = now + relativedelta(months=1)
in_3_months = now + relativedelta(months=3)
next_year = now + relativedelta(years=1)

print(f"Now: {now}")
print(f"Next month: {next_month}")
print(f"In 3 months: {in_3_months}")
print(f"Next year: {next_year}")

# Handle edge cases (e.g., Jan 31 + 1 month = Feb 28/29)
jan_31 = datetime(2024, 1, 31)
feb = jan_31 + relativedelta(months=1)
print(f"Jan 31 + 1 month: {feb}")  # 2024-02-29 (leap year)
```

---

## Practical Examples

### Log Rotation by Date

```python
from datetime import datetime
from pathlib import Path

def get_log_filename():
    """Generate log filename with current date."""
    today = datetime.now().strftime("%Y-%m-%d")
    return f"app-{today}.log"

def should_rotate_log(log_path, max_age_days=7):
    """Check if log file is older than max_age_days."""
    if not log_path.exists():
        return False

    mtime = datetime.fromtimestamp(log_path.stat().st_mtime)
    age = datetime.now() - mtime
    return age.days > max_age_days
```

### Scheduling and Cron-like Operations

```python
from datetime import datetime, timedelta

def next_occurrence(hour, minute, from_time=None):
    """Find next occurrence of a specific time."""

    from_time = from_time or datetime.now()
    target = from_time.replace(hour=hour, minute=minute, second=0, microsecond=0)

    # If time has passed today, schedule for tomorrow
    if target <= from_time:
        target += timedelta(days=1)

    return target

# Next 9 AM
next_9am = next_occurrence(9, 0)
print(f"Next 9 AM: {next_9am}")

# Time until then
time_until = next_9am - datetime.now()
print(f"Time until: {time_until}")
```

---

## Summary

Key points for working with dates and times in Python:

1. Use `datetime` for combined date and time, `date` for dates only
2. Parse strings with `strptime()`, format with `strftime()`
3. Use `timedelta` for date arithmetic
4. Always store times in UTC and convert for display
5. Use `zoneinfo` (Python 3.9+) or `pytz` for time zone handling
6. Consider `dateutil` for flexible parsing and month arithmetic
7. Be careful with naive vs. aware datetimes
