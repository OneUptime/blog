# Validation Summary: How to Fix 'Insecure Deserialization' Vulnerabilities

## Status
validated

## Post Type
Technical security guide

## Technologies Covered
- Insecure deserialization
- OWASP Top 10 and OWASP Deserialization guidance
- Python pickle, JSON, and HMAC
- JavaScript JSON.parse, eval, Node.js crypto, Joi, and protobuf.js
- Java ObjectInputStream and Jackson databind
- PHP unserialize, JSON, HMAC, and hash_equals
- Mermaid diagrams

## Sources Consulted
- OWASP Deserialization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html
- OWASP Top 10 2021 A08 Software and Data Integrity Failures: https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/
- Python pickle documentation: https://docs.python.org/3/library/pickle.html
- Python hmac documentation: https://docs.python.org/3/library/hmac.html
- MDN JSON.parse documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
- Node.js crypto documentation for timingSafeEqual and HMAC APIs: https://nodejs.org/api/crypto.html
- Oracle Java ObjectInputStream documentation: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/io/ObjectInputStream.html
- Oracle Java Serialization Filtering guide: https://docs.oracle.com/en/java/javase/25/core/serialization-filtering1.html
- FasterXML Jackson polymorphic deserialization documentation: https://github.com/FasterXML/jackson-docs/wiki/JacksonPolymorphicDeserialization
- PHP unserialize documentation: https://www.php.net/manual/en/function.unserialize.php
- PHP hash_equals documentation: https://www.php.net/manual/en/function.hash-equals.php
- PHP RuntimeException documentation: https://www.php.net/manual/en/class.runtimeexception.php
- protobuf.js documentation: https://protobufjs.github.io/protobuf.js/

## Issues Found
- The JavaScript vulnerable example was titled as prototype pollution but demonstrated unsafe `eval` parsing. I changed the heading to "Unsafe eval-based Parsing" to match the actual vulnerability.
- The JavaScript `eval` payload defined a function but did not execute the malicious command during parsing. I changed it to an immediately invoked expression so the example matches the stated behavior.
- The PHP malicious serialized payload used `s:7:"attacker"` even though `attacker` is 8 bytes. I corrected the length to `s:8:"attacker"` so the payload is valid serialized PHP data.
- The Python secure deserializer claimed to validate roles explicitly but used `list(parsed['roles'])`, which would accept a string and split it into characters. I added an explicit list-of-strings check.
- The Node.js HMAC verification example passed arbitrary string buffers directly to `crypto.timingSafeEqual`. Node.js requires equal byte lengths and throws otherwise, so I added signed-data format checks, hex signature validation, and fixed-length hex buffer comparison.
- The Java/Jackson example enabled default typing while also deserializing into explicit target classes. That is unnecessary for the shown safe pattern and can increase risk when polymorphic typing is not needed. I changed the example to use explicit target types without activating default typing.
- The Java code block used `List` without importing it and declared two public classes in one snippet. I added `java.util.List` and made `UserData` package-private so the snippet can compile as a single illustrative file once Jackson is on the classpath.
- The PHP secure example threw `SecurityException`, which is not a predefined PHP exception. I changed it to `RuntimeException`.
- The PHP username validation called `preg_match` without first ensuring the value was a string. I added an `is_string` check to avoid type errors for non-string input.

## Review Notes
Python snippets were syntax-checked successfully with `python3` AST parsing. JavaScript snippets were syntax-checked successfully with `node --check`. PHP is not installed in this environment, so PHP changes were verified against the official PHP manual rather than local linting. Java/Jackson examples were reviewed against Oracle and Jackson documentation; they were not compiled locally because Jackson dependencies are not installed in this blog repository.
