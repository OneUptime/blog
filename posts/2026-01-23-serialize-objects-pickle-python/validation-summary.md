# Validation Summary: How to Serialize Objects with pickle in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python pickle module
- JSON serialization
- Pydantic
- joblib
- gzip compression
- Basic model persistence concepts

## Sources Consulted
- Python pickle documentation: https://docs.python.org/3/library/pickle.html
- Pydantic migration guide: https://pydantic.dev/docs/validation/latest/get-started/migration/
- joblib persistence documentation: https://joblib.readthedocs.io/en/stable/persistence.html
- scikit-learn model persistence documentation: https://scikit-learn.org/stable/model_persistence.html

## Issues Found
- The introduction said pickle can handle "almost any Python object, including custom classes, functions, and nested structures." This was too broad because pickle serializes functions and classes by qualified name and requires them to be importable, rather than serializing their code by value. Updated the text to say pickle handles many Python object types, custom class instances, nested structures, and top-level importable functions/classes.
- The protocol comments said protocol 4 is the default in Python 3.8+ and protocol 5 only has out-of-band buffer support in Python 3.8+. Python 3.14 changed the default protocol to 5. Updated the comments to say protocol 4 is the default in Python 3.8-3.13 and protocol 5 is the default in Python 3.14+.
- The Pydantic example used `BaseModel.parse_raw`, which is deprecated in Pydantic v2. Updated it to `BaseModel.model_validate_json`.

## Review Notes
- All 15 Python code blocks parse successfully with `python3`.
- The joblib example remains illustrative because `train_model()` is a placeholder, not a complete runnable function.
- The post correctly warns against unpickling untrusted data. joblib has the same trust boundary because it is pickle-based.
