# How to Work with XML Files in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, XML, File Handling, Data Processing, ElementTree, lxml, Parsing

Description: Learn how to read, write, parse, and manipulate XML files in Python using the built-in ElementTree module and the powerful lxml library. This guide covers practical examples for common XML operations.

---

> XML remains a critical data format in many enterprise systems, APIs, and configuration files. Python provides excellent tools for working with XML data, from the built-in ElementTree module to the feature-rich lxml library.

Whether you are parsing SOAP API responses, reading configuration files, or processing data feeds, understanding XML handling in Python is essential. This guide walks you through the most common operations with practical, working examples.

---

## Understanding XML Structure

Before diving into the code, let's understand what we are working with. XML (Extensible Markup Language) uses a tree structure with elements, attributes, and text content.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bookstore>
    <book category="fiction">
        <title lang="en">The Great Gatsby</title>
        <author>F. Scott Fitzgerald</author>
        <price>10.99</price>
    </book>
    <book category="non-fiction">
        <title lang="en">Clean Code</title>
        <author>Robert C. Martin</author>
        <price>34.99</price>
    </book>
</bookstore>
```

---

## Using the Built-in ElementTree Module

Python's `xml.etree.ElementTree` module is included in the standard library and handles most XML tasks well.

### Reading XML from a File

```python
# xml_reader.py
# Reading and parsing XML files with ElementTree
import xml.etree.ElementTree as ET

def read_xml_file(filepath):
    """Read and parse an XML file, returning the root element."""
    # Parse the XML file and get the tree structure
    tree = ET.parse(filepath)

    # Get the root element of the tree
    root = tree.getroot()

    return root

def extract_book_data(root):
    """Extract book information from the XML structure."""
    books = []

    # Find all 'book' elements under the root
    for book in root.findall('book'):
        # Get the 'category' attribute from the book element
        category = book.get('category')

        # Find child elements and get their text content
        title = book.find('title').text
        author = book.find('author').text
        price = float(book.find('price').text)

        # Get the 'lang' attribute from the title element
        language = book.find('title').get('lang', 'unknown')

        books.append({
            'category': category,
            'title': title,
            'author': author,
            'price': price,
            'language': language
        })

    return books

# Example usage
if __name__ == "__main__":
    root = read_xml_file('bookstore.xml')
    books = extract_book_data(root)

    for book in books:
        print(f"{book['title']} by {book['author']} - ${book['price']}")
```

### Parsing XML from a String

```python
# xml_from_string.py
# Parse XML content directly from a string
import xml.etree.ElementTree as ET

xml_string = """<?xml version="1.0"?>
<response>
    <status>success</status>
    <data>
        <user id="123">
            <name>John Doe</name>
            <email>john@example.com</email>
        </user>
    </data>
</response>
"""

def parse_xml_string(xml_content):
    """Parse XML from a string and extract data."""
    # Use fromstring() to parse XML from a string
    root = ET.fromstring(xml_content)

    # Check the status element
    status = root.find('status').text
    print(f"Response status: {status}")

    # Navigate nested elements using path notation
    user = root.find('data/user')
    if user is not None:
        user_id = user.get('id')
        name = user.find('name').text
        email = user.find('email').text

        return {
            'id': user_id,
            'name': name,
            'email': email
        }

    return None

# Parse and print the user data
user_data = parse_xml_string(xml_string)
print(f"User: {user_data}")
```

---

## Creating XML Documents

### Building XML from Scratch

```python
# xml_creator.py
# Create XML documents programmatically
import xml.etree.ElementTree as ET

def create_product_catalog(products):
    """Create an XML catalog from a list of product dictionaries."""
    # Create the root element
    catalog = ET.Element('catalog')
    catalog.set('version', '1.0')

    for product in products:
        # Create a product element with an attribute
        product_elem = ET.SubElement(catalog, 'product')
        product_elem.set('id', str(product['id']))

        # Add child elements with text content
        name = ET.SubElement(product_elem, 'name')
        name.text = product['name']

        price = ET.SubElement(product_elem, 'price')
        price.set('currency', 'USD')
        price.text = str(product['price'])

        # Add optional elements only if data exists
        if product.get('description'):
            desc = ET.SubElement(product_elem, 'description')
            desc.text = product['description']

        # Add a list of tags as child elements
        if product.get('tags'):
            tags_elem = ET.SubElement(product_elem, 'tags')
            for tag in product['tags']:
                tag_elem = ET.SubElement(tags_elem, 'tag')
                tag_elem.text = tag

    return catalog

def save_xml_to_file(root, filepath, pretty_print=True):
    """Save an XML element tree to a file."""
    # Create an ElementTree object from the root element
    tree = ET.ElementTree(root)

    if pretty_print:
        # Add indentation for readability
        ET.indent(tree, space="    ")

    # Write to file with XML declaration
    tree.write(filepath, encoding='utf-8', xml_declaration=True)
    print(f"XML saved to {filepath}")

# Example usage
products = [
    {
        'id': 1,
        'name': 'Laptop',
        'price': 999.99,
        'description': 'High-performance laptop',
        'tags': ['electronics', 'computers']
    },
    {
        'id': 2,
        'name': 'Mouse',
        'price': 29.99,
        'tags': ['electronics', 'accessories']
    }
]

catalog = create_product_catalog(products)
save_xml_to_file(catalog, 'catalog.xml')
```

---

## Modifying Existing XML

```python
# xml_modifier.py
# Modify existing XML documents
import xml.etree.ElementTree as ET

def update_prices(filepath, discount_percent):
    """Apply a discount to all prices in an XML file."""
    tree = ET.parse(filepath)
    root = tree.getroot()

    # Find all price elements anywhere in the document
    for price_elem in root.iter('price'):
        current_price = float(price_elem.text)
        # Calculate the discounted price
        new_price = current_price * (1 - discount_percent / 100)
        price_elem.text = f"{new_price:.2f}"

        # Add an attribute to track the discount
        price_elem.set('discounted', 'true')

    # Save the modified tree back to the file
    tree.write(filepath, encoding='utf-8', xml_declaration=True)

def add_element(filepath, parent_path, new_element_name, text_content):
    """Add a new element to an existing XML document."""
    tree = ET.parse(filepath)
    root = tree.getroot()

    # Find the parent element
    parent = root.find(parent_path)
    if parent is not None:
        # Create and add the new element
        new_elem = ET.SubElement(parent, new_element_name)
        new_elem.text = text_content
        tree.write(filepath, encoding='utf-8', xml_declaration=True)
        return True

    return False

def remove_elements(filepath, element_path):
    """Remove all elements matching the given path."""
    tree = ET.parse(filepath)
    root = tree.getroot()

    # Find all elements to remove
    for elem in root.findall(element_path):
        # Get the parent element to perform removal
        parent = root.find(f".//{elem.tag}/..")
        if parent is not None:
            parent.remove(elem)

    tree.write(filepath, encoding='utf-8', xml_declaration=True)
```

---

## Using XPath for Advanced Queries

```python
# xpath_queries.py
# Advanced XML querying with XPath expressions
import xml.etree.ElementTree as ET

xml_data = """<?xml version="1.0"?>
<employees>
    <department name="Engineering">
        <employee id="1" status="active">
            <name>Alice Smith</name>
            <salary>75000</salary>
        </employee>
        <employee id="2" status="inactive">
            <name>Bob Jones</name>
            <salary>65000</salary>
        </employee>
    </department>
    <department name="Marketing">
        <employee id="3" status="active">
            <name>Carol White</name>
            <salary>60000</salary>
        </employee>
    </department>
</employees>
"""

root = ET.fromstring(xml_data)

# Find all employees (anywhere in the document)
all_employees = root.findall('.//employee')
print(f"Total employees: {len(all_employees)}")

# Find employees with a specific attribute value
active_employees = root.findall(".//employee[@status='active']")
print(f"Active employees: {len(active_employees)}")

# Find employees in a specific department
engineering = root.findall(".//department[@name='Engineering']/employee")
print(f"Engineering employees: {len(engineering)}")

# Find employees with salary above a threshold
for emp in root.findall('.//employee'):
    salary = int(emp.find('salary').text)
    if salary > 65000:
        name = emp.find('name').text
        print(f"High earner: {name} - ${salary}")
```

---

## Working with lxml for Better Performance

The `lxml` library offers better performance and more features than ElementTree.

```python
# lxml_example.py
# Using lxml for advanced XML processing
from lxml import etree

def parse_with_lxml(xml_content):
    """Parse XML using lxml with full XPath support."""
    # Parse the XML content
    root = etree.fromstring(xml_content.encode())

    # lxml supports full XPath 1.0 expressions
    # Find elements using complex XPath queries
    results = root.xpath('//employee[salary > 60000]/name/text()')

    return results

def validate_xml_with_schema(xml_file, schema_file):
    """Validate an XML file against an XSD schema."""
    # Load the schema
    with open(schema_file, 'rb') as f:
        schema_doc = etree.parse(f)
        schema = etree.XMLSchema(schema_doc)

    # Parse the XML file
    with open(xml_file, 'rb') as f:
        xml_doc = etree.parse(f)

    # Validate and return the result
    is_valid = schema.validate(xml_doc)

    if not is_valid:
        # Get validation errors
        errors = schema.error_log
        for error in errors:
            print(f"Line {error.line}: {error.message}")

    return is_valid

def transform_xml_with_xslt(xml_file, xslt_file):
    """Transform XML using an XSLT stylesheet."""
    # Load the XML and XSLT files
    xml_doc = etree.parse(xml_file)
    xslt_doc = etree.parse(xslt_file)

    # Create a transformer
    transform = etree.XSLT(xslt_doc)

    # Apply the transformation
    result = transform(xml_doc)

    return str(result)
```

---

## Handling Large XML Files

For large XML files, use iterparse to avoid loading everything into memory.

```python
# large_xml_handler.py
# Process large XML files efficiently with iterparse
import xml.etree.ElementTree as ET

def process_large_xml(filepath, target_tag):
    """Process a large XML file element by element."""
    # Track statistics
    count = 0

    # Use iterparse to stream through the file
    # The 'end' event fires when an element's closing tag is found
    for event, elem in ET.iterparse(filepath, events=('end',)):
        if elem.tag == target_tag:
            # Process the element
            yield elem
            count += 1

            # Clear the element from memory to avoid buildup
            elem.clear()

    print(f"Processed {count} {target_tag} elements")

# Example: Process a large product feed
for product in process_large_xml('large_catalog.xml', 'product'):
    name = product.find('name')
    if name is not None:
        print(f"Processing: {name.text}")
```

---

## Best Practices

1. **Choose the right parser**: Use ElementTree for simple tasks, lxml for complex operations
2. **Handle missing elements**: Always check if `find()` returns None before accessing `.text`
3. **Use iterparse for large files**: Avoid memory issues by streaming large documents
4. **Validate input**: Use XSD schemas to validate XML from external sources
5. **Encode properly**: Always specify encoding when writing XML files

---

## Conclusion

Working with XML in Python is straightforward once you understand the available tools. ElementTree handles most common tasks, while lxml provides advanced features like full XPath support and XSLT transformations. Remember to use iterparse for large files and always validate untrusted XML input.

---

*Need to monitor your Python applications that process XML data? [OneUptime](https://oneuptime.com) provides comprehensive monitoring to track performance and catch errors in your data processing pipelines.*

