# How to Use ExtractValue() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, XML, Function, String

Description: Learn how to use ExtractValue() in MySQL to extract text from XML strings using XPath expressions, enabling XML data querying within SQL statements.

---

## What Is ExtractValue()?

`ExtractValue()` is a MySQL function that extracts text content from an XML string using an XPath locator expression. It is one of MySQL's built-in XML functions and lets you query XML stored in a column directly within a SQL statement, without needing application-side XML parsing.

## Basic Syntax

```sql
ExtractValue(xml_frag, xpath_expr)
```

- `xml_frag` - a string containing valid XML
- `xpath_expr` - an XPath 1.0 expression identifying the node(s) to extract

The function returns the text content of the matched nodes. If multiple nodes match, their values are returned space-separated.

## Simple Examples

```sql
-- Extract a single element
SELECT ExtractValue('<order><id>42</id><total>99.99</total></order>', '/order/id');
-- Result: 42

-- Extract nested element
SELECT ExtractValue('<root><user><name>Alice</name></user></root>', '/root/user/name');
-- Result: Alice

-- Multiple matching nodes
SELECT ExtractValue('<items><item>A</item><item>B</item><item>C</item></items>', '/items/item');
-- Result: A B C
```

## Querying XML Stored in a Column

```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_xml TEXT
);

INSERT INTO orders (order_xml) VALUES
('<order><customer>Alice</customer><total>150.00</total><status>shipped</status></order>'),
('<order><customer>Bob</customer><total>75.50</total><status>pending</status></order>');

-- Extract customer names
SELECT id, ExtractValue(order_xml, '/order/customer') AS customer
FROM orders;

-- Extract and filter by status
SELECT id, ExtractValue(order_xml, '/order/total') AS total
FROM orders
WHERE ExtractValue(order_xml, '/order/status') = 'shipped';
```

## Using XPath Attributes

```sql
-- XML with attributes
SET @xml = '<product id="101" category="electronics"><name>Laptop</name><price>999</price></product>';

-- Extract attribute value using @
SELECT ExtractValue(@xml, '/product/@id');        -- Result: 101
SELECT ExtractValue(@xml, '/product/@category');  -- Result: electronics
SELECT ExtractValue(@xml, '/product/name');       -- Result: Laptop
```

## Using Wildcards and Paths

```sql
SET @xml = '<root><a><b>value1</b></a><a><b>value2</b></a></root>';

-- Extract all /root/a/b values
SELECT ExtractValue(@xml, '/root/a/b');  -- Result: value1 value2

-- Wildcard: select any direct child of root
SET @xml2 = '<root><x>hello</x><y>world</y></root>';
SELECT ExtractValue(@xml2, '/root/*');   -- Result: hello world
```

## Handling Missing Nodes

```sql
-- Returns empty string if the path does not match
SELECT ExtractValue('<root><a>1</a></root>', '/root/b');  -- Result: (empty string)
```

## Combining with Other Functions

```sql
-- Trim and convert the extracted value
SELECT TRIM(ExtractValue(order_xml, '/order/total')) + 0 AS total_numeric
FROM orders;

-- Use in ORDER BY
SELECT id, ExtractValue(order_xml, '/order/total') AS total
FROM orders
ORDER BY ExtractValue(order_xml, '/order/total') + 0 DESC;
```

## Limitations

- `ExtractValue()` returns text content only, not XML nodes or sub-trees.
- For full XML manipulation, use `UpdateXML()` to modify XML strings.
- XPath support is limited to XPath 1.0 subset; functions like `starts-with()` and `normalize-space()` are not supported.

## Summary

`ExtractValue()` is MySQL's primary tool for reading data from XML strings stored in columns. Pair it with XPath expressions to extract element text or attribute values, filter rows by XML content, and sort results based on XML fields. For large-scale XML workloads, consider migrating to JSON, which has richer native support in MySQL 5.7 and later.
