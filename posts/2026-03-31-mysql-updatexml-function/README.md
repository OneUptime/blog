# How to Use UpdateXML() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, XML, Function, String

Description: Learn how to use UpdateXML() in MySQL to modify XML strings in-place using XPath targeting, enabling XML content updates directly within SQL queries.

---

## What Is UpdateXML()?

`UpdateXML()` is a MySQL function that modifies an XML string by replacing the node matched by an XPath expression with new XML content. It is the complement to `ExtractValue()` - while `ExtractValue()` reads from XML, `UpdateXML()` writes back to it.

## Basic Syntax

```sql
UpdateXML(xml_target, xpath_expr, new_xml)
```

- `xml_target` - the original XML string
- `xpath_expr` - an XPath expression identifying the node to replace
- `new_xml` - the replacement XML fragment

The function returns the modified XML string. If the XPath does not match any node, or if it matches more than one node, the original string is returned unchanged.

## Simple Examples

```sql
-- Replace the value of a single element
SELECT UpdateXML(
  '<order><status>pending</status><total>100</total></order>',
  '/order/status',
  '<status>shipped</status>'
);
-- Result: <order><status>shipped</status><total>100</total></order>

-- Replace a nested element
SELECT UpdateXML(
  '<root><user><email>old@example.com</email></user></root>',
  '/root/user/email',
  '<email>new@example.com</email>'
);
-- Result: <root><user><email>new@example.com</email></user></root>
```

## Updating XML Stored in a Column

```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_xml TEXT
);

INSERT INTO orders (order_xml) VALUES
('<order><status>pending</status><total>150.00</total></order>'),
('<order><status>processing</status><total>75.50</total></order>');

-- Update the status of all pending orders to 'shipped'
UPDATE orders
SET order_xml = UpdateXML(order_xml, '/order/status', '<status>shipped</status>')
WHERE ExtractValue(order_xml, '/order/status') = 'pending';

-- Verify
SELECT id, ExtractValue(order_xml, '/order/status') AS status FROM orders;
```

## Replacing Attribute Values

```sql
SET @xml = '<product id="101"><name>Laptop</name></product>';

-- Replace the id attribute
SELECT UpdateXML(@xml, '/product/@id', '202');
-- Result: <product id="202"><name>Laptop</name></product>
```

## Chaining Multiple Updates

`UpdateXML()` returns a string, so you can nest calls for multiple modifications:

```sql
-- Update both status and total in one statement
UPDATE orders
SET order_xml = UpdateXML(
  UpdateXML(order_xml, '/order/status', '<status>shipped</status>'),
  '/order/total',
  '<total>200.00</total>'
)
WHERE id = 1;
```

## Handling Unmatched XPath

```sql
-- If the XPath does not match, the original XML is returned unchanged
SELECT UpdateXML(
  '<root><a>1</a></root>',
  '/root/b',
  '<b>2</b>'
);
-- Result: <root><a>1</a></root>  (unchanged)
```

## Inserting New Nodes

`UpdateXML()` replaces, not appends. To add a new node, you need to include the parent:

```sql
-- Add a new child by replacing the parent
SELECT UpdateXML(
  '<order><total>100</total></order>',
  '/order',
  '<order><total>100</total><discount>10</discount></order>'
);
```

## Limitations and Alternatives

- `UpdateXML()` works on string representations, not a native XML type.
- If the XPath matches more than one node, no replacement is performed and the original XML is returned unchanged.
- For complex XML workflows, consider storing data as JSON instead, which has richer native support in MySQL 5.7 and later with `JSON_SET()`, `JSON_REPLACE()`, and other dedicated functions.

## Summary

`UpdateXML()` is MySQL's built-in function for modifying XML strings in place. It works alongside `ExtractValue()` to provide read-write access to XML data stored in text columns. Use it when you need to patch XML fields in existing rows without reading them into application code, and chain multiple `UpdateXML()` calls to apply several changes in a single SQL statement.
