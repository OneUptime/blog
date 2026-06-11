# Validation Summary: How to Implement Custom Descriptors in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python descriptor protocol
- Object-oriented programming
- Attribute access and validation
- Lazy properties and caching

## Sources Consulted
- Python Descriptor Guide: https://docs.python.org/3/howto/descriptor.html
- Python Data Model documentation for `__set_name__`: https://docs.python.org/3/reference/datamodel.html
- What's New In Python 3.6, PEP 487 descriptor protocol enhancements: https://docs.python.org/3/whatsnew/3.6.html

## Issues Found
- The data descriptor definition said data descriptors implement both `__get__` and `__set__` (or `__delete__`). Python's official descriptor guide defines a data descriptor as an object that defines `__set__()` or `__delete__()`. Updated the wording to say data descriptors implement `__set__` or `__delete__`, typically along with `__get__`.
- The lazy property example comment said `setattr(obj, self.name, value)` replaces the descriptor with the computed value. Because `LazyProperty` is a non-data descriptor, assignment stores the value on the instance and shadows the class descriptor; it does not replace the descriptor on the class. Updated the comment to say it caches the value in the instance dictionary.

## Review Notes
The code examples were executed with Python 3.12.3 and behaved as described after the wording corrections. The examples use current Python descriptor APIs, and `__set_name__` is correctly described as a Python 3.6 addition.
