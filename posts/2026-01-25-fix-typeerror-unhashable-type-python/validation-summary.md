# Validation Summary: How to Fix 'TypeError: unhashable type' in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Python dictionaries and sets
- Python hashability and `__hash__`
- Python `dataclasses`
- Python `collections.namedtuple`
- Python `json`
- Python `functools.wraps`

## Sources Consulted
- Python Glossary: hashable objects - https://docs.python.org/3/glossary.html#term-hashable
- Python Data Model: `object.__hash__` - https://docs.python.org/3/reference/datamodel.html#object.__hash__
- Python Data Model: dictionary key requirements - https://docs.python.org/3/reference/datamodel.html#mappings
- Python Built-in Types: set and frozenset - https://docs.python.org/3/library/stdtypes.html#set-types-set-frozenset
- Python `dataclasses` documentation: implicit `__hash__` rules - https://docs.python.org/3/library/dataclasses.html#dataclasses.dataclass

## Issues Found
- The post described a hash as an integer that "uniquely identifies" an object's value. This was inaccurate because hash collisions are possible; Python only requires objects that compare equal to have the same hash value. Updated the wording to describe hashes as integers used for quick comparison and lookup.
- The recursive `make_hashable()` helper in the nested structures example did not handle tuples, so `make_hashable((1, 2, [3, 4]))` returned the original tuple containing a list and `hash(hashable_data)` still raised `TypeError`. Added tuple handling so nested tuple contents are recursively converted.
- The memoization helper had the same tuple-recursion gap. Added tuple handling there too, so tuple arguments containing nested unhashable values are converted consistently.
- The post stated "Frozen dataclasses are hashable" too broadly. Python generates `__hash__` for `@dataclass(frozen=True)` when `eq=True`, but hashing an instance can still fail if fields are unhashable. Updated the wording to say frozen dataclasses with hashable fields are hashable by default.
- The summary table listed `frozenset(dict.items())` as a dictionary alternative without noting that dictionary items must themselves be hashable. Added that qualification.

## Review Notes
The code examples were syntactically valid after the tuple-recursion fix. Focused runtime checks were run for the nested conversion, custom class hashing, frozen dataclass example, and memoization cache behavior.
