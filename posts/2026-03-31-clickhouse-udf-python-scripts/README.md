# How to Create UDFs with Python Scripts in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, UDF, Python, Executable Script, Machine Learning

Description: Learn how to create Python-backed UDFs in ClickHouse to run custom Python logic, ML models, and NLP operations directly inside SQL queries.

---

Python executable UDFs are the most powerful way to extend ClickHouse with custom logic. They allow you to invoke Python libraries, machine learning models, and data transformation code from within a SQL query.

## Prerequisites

- Python 3 installed on the ClickHouse server
- Required packages installed for the `clickhouse` OS user
- The script placed in `/var/lib/clickhouse/user_scripts/`

## Simple Python UDF Example

Create the script:

```text
#!/usr/bin/env python3
# /var/lib/clickhouse/user_scripts/normalize_phone.py
import sys
import re

for line in sys.stdin:
    phone = line.strip()
    normalized = re.sub(r'[^0-9+]', '', phone)
    if normalized.startswith('00'):
        normalized = '+' + normalized[2:]
    print(normalized)
    sys.stdout.flush()
```

Define the UDF in XML (`/etc/clickhouse-server/normalize_phone_function.xml`):

```text
<functions>
    <function>
        <name>normalizePhone</name>
        <type>executable</type>
        <return_type>String</return_type>
        <argument>
            <type>String</type>
            <name>phone</name>
        </argument>
        <format>TabSeparated</format>
        <command>normalize_phone.py</command>
    </function>
</functions>
```

## Calling the Python UDF

```sql
SELECT
    user_id,
    normalizePhone(phone_number) AS normalized_phone
FROM users
LIMIT 10;
```

## Persistent Process Mode (executable_pool)

For expensive initialization (loading a model), use `executable_pool` to keep the Python process alive across calls:

```text
<type>executable_pool</type>
<pool_size>4</pool_size>
<command>classifier.py</command>
```

The script must handle multiple batches in a loop:

```text
#!/usr/bin/env python3
import sys
import joblib

model = joblib.load('/var/lib/clickhouse/models/spam_classifier.pkl')

for line in sys.stdin:
    text = line.strip()
    if not text:
        continue
    prediction = model.predict([text])[0]
    print(prediction)
    sys.stdout.flush()
```

## Multi-Argument Python UDF

```text
#!/usr/bin/env python3
import sys

for line in sys.stdin:
    parts = line.strip().split('\t')
    if len(parts) < 2:
        print('0')
        sys.stdout.flush()
        continue
    score = float(parts[0])
    weight = float(parts[1])
    print(round(score * weight, 4))
    sys.stdout.flush()
```

Define with two arguments in XML:

```text
<argument><type>Float64</type><name>score</name></argument>
<argument><type>Float64</type><name>weight</name></argument>
```

## Installing Python Packages for the clickhouse User

```bash
sudo -u clickhouse pip3 install scikit-learn joblib pandas
```

## Verifying the UDF

```sql
SELECT normalizePhone('+1 (800) 555-1234') AS result;
```

## Summary

Python executable UDFs in ClickHouse bridge the gap between SQL analytics and Python's rich ecosystem of libraries. By writing a stdin/stdout script, registering it in XML config, and optionally using `executable_pool` for persistent processes, you can run ML models, NLP pipelines, and custom transformations directly from ClickHouse SQL queries.
