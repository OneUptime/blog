# Validation Summary: How to Work with XML Files in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- XML
- `xml.etree.ElementTree`
- ElementTree XPath subset
- `lxml.etree`
- XPath 1.0
- XML Schema validation
- XSLT transformations

## Sources Consulted
- Python documentation: `xml.etree.ElementTree` - The ElementTree XML API: https://docs.python.org/3/library/xml.etree.elementtree.html
- lxml documentation: The `lxml.etree` Tutorial: https://lxml.de/tutorial.html
- lxml documentation: XPath and XSLT with lxml: https://lxml.de/xpathxslt.html
- lxml documentation: Validation with lxml: https://lxml.de/validation.html

## Issues Found
- The `remove_elements()` example attempted to find each element's parent with `root.find(f".//{elem.tag}/..")`. That can select the wrong parent when `element_path` matches only a filtered subset of elements with the same tag. Updated the function to build a child-to-parent map with `root.iter()` and remove each matched element from its actual parent.

## Review Notes
- The ElementTree examples use current APIs. `ET.indent()` is available in Python 3.9 and newer.
- ElementTree supports only a limited XPath subset, while `lxml.etree.xpath()` supports full XPath syntax as documented by lxml. The examples reflect that distinction.
- The examples are technically correct for trusted sample XML. For production handling of untrusted XML, Python's official documentation recommends reviewing XML security guidance.
