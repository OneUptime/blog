# Validation Summary: How to Sign CloudStack API Requests Correctly When Parameters Contain URLs

## Status

validated

## Post Type

Technical tutorial and troubleshooting guide with Python code and Bash commands.

## Technologies Covered

- Apache CloudStack query API and CloudMonkey
- Python 3: urllib.parse, hmac, hashlib, base64, venv
- Requests HTTP client
- Java URLEncoder canonicalization
- HTTP form encoding, nested URLs, Unicode, HTTPS and TLS
- HMAC-SHA1 authentication and SHA-256 diagnostic hashes
- Bash and systemd journalctl

## Sources Consulted

- CloudStack Programmer Guide, including signing rules: https://docs.cloudstack.apache.org/en/latest/developersguide/dev.html
- CloudStack Provisioning and Authentication API: https://docs.cloudstack.apache.org/en/latest/adminguide/api.html
- CloudStack API index: https://cloudstack.apache.org/api/
- CloudStack registerTemplate reference (4.22): https://cloudstack.apache.org/api/apidocs-4.22/apis/registerTemplate.html
- CloudStack listZones reference (4.22): https://cloudstack.apache.org/api/apidocs-4.22/apis/listZones.html
- CloudStack server signature verification implementation: https://raw.githubusercontent.com/apache/cloudstack/main/server/src/main/java/com/cloud/api/ApiServer.java
- CloudStack API servlet implementation: https://raw.githubusercontent.com/apache/cloudstack/main/server/src/main/java/com/cloud/api/ApiServlet.java
- CloudStack management logging documentation: https://docs.cloudstack.apache.org/en/latest/adminguide/troubleshooting.html
- Java URLEncoder rules: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/URLEncoder.html
- Python URL parsing and encoding: https://docs.python.org/3/library/urllib.parse.html
- Python HMAC: https://docs.python.org/3/library/hmac.html
- Python Base64: https://docs.python.org/3/library/base64.html
- Python virtual environments: https://docs.python.org/3/library/venv.html
- pip install: https://pip.pypa.io/en/stable/cli/pip_install/
- Requests API, including timeouts, redirects and verification: https://requests.readthedocs.io/en/latest/api/
- Requests CA bundle configuration: https://requests.readthedocs.io/en/latest/user/advanced/
- RFC 3986, URI syntax and percent encoding: https://www.rfc-editor.org/rfc/rfc3986.html
- systemd official journalctl manual source: https://raw.githubusercontent.com/systemd/systemd/main/man/journalctl.xml
- Local Bash built-in help (`bash -c 'help read'`), confirming `-r` and `-s`. The GNU website and rendered systemd manual were unavailable through the browser tool; local Bash help and upstream systemd source supplied the relevant verification.

## Issues Found

1. **Canonicalization differed for asterisks and tildes.** Python's default quoting escapes `*` and leaves `~` unchanged, whereas the Java encoder used by CloudStack does the reverse. Changed the signing encoder to preserve `*` and replace literal `~` with `%7E`, retained space conversion, clarified the signing rule, and added an assertion covering both characters and an existing percent escape.
2. **Unsupported listZones argument.** `listall` is absent from the command's documented parameters. Replaced it with `available="true"`, `page="1"`, and `pagesize="1"` to request a small page of available zones.
3. **HTTPS enforcement did not cover redirects.** Requests follows redirects by default, so checking only the initial endpoint does not guarantee that a signed body stays on HTTPS. Set `allow_redirects=False`.
4. **Shell-history claim conflicted with the API-key export.** Typing the real key in an export command could record it in shell history. Changed API-key entry to a silent read, matching secret-key entry. Clarified that the commands use Bash, that the code must be saved as `cs_call.py`, and that the download URL is a placeholder.
5. **Literal spaces were presented as valid download URL content.** Clarified that real URLs need percent-encoded spaces and that the raw-space example is an encoding test.
6. **The query-splitting heading misidentified the error.** The example concatenates an unencoded inner URL; an appropriately encoded query does not contain unescaped inner ampersands. Corrected the heading to describe the demonstrated error without changing the section structure.
7. **Unicode advice could alter signed URL tokens.** Replaced advice to preserve a normalized value with advice to preserve the original value without changing Unicode normalization.
8. **HTTP-only success was attributed solely to CA trust.** Broadened the troubleshooting row to include HTTPS listener and proxy-routing configuration, which can also cause the symptom.
9. **Journal command capabilities were overstated.** The command selects a unit and time range, not a caller, and detailed CloudStack logs may reside in the management log file. Corrected the introduction and included the documented log path.
10. **Expiring-signature deployment requirements were omitted.** Added a caveat for deployments requiring signature version 3 and an expiry, including signing both fields and the enforced 15-minute maximum found in server verification code.

## Review Notes

- All Python code blocks parsed successfully. Executed the published canonicalization assertions, including the added regression assertion.
- Compared the revised encoder against an independent byte-oriented implementation of Java's documented rules for every printable ASCII character, Unicode text, an empty value, and a nested URL containing mixed case, plus, percent escapes, asterisk and tilde. All checks passed.
- Checked field ordering, exclusion of the signature parameter, and HMAC output against an independently assembled canonical string.
- Mocked Requests POST and decoded the actual constructed form body once. Confirmed exact nested-URL and command preservation, recoverable Base64 signature, signature agreement after decoding, timeout settings, disabled redirects, HTTP rejection, and default TLS verification. All checks passed.
- Both Bash blocks passed `bash -n`. Verified journalctl options against upstream documentation; did not execute privileged journal access on this macOS workstation.
- The post's five official documentation links resolved to the intended resources. Example domains and UUID/key placeholders are illustrative and were not treated as operational services.
- Current CloudStack guide pages resolved to 4.23 documentation; command parameters were checked against the available 4.22 reference, and encoding/expiry behavior against upstream server source. Moving latest/main links are not immutable release references.
- No live CloudStack account or endpoint was supplied. Template registration, actual download acceptance, server authentication, CA-chain behavior, and CloudMonkey interoperability were not exercised. Local checks validate construction and documented protocol behavior, not an end-to-end deployment.
- The deliberate unsafe concatenation example remains an anti-example. The signer accepts scalar logical values; callers must flatten complex API arguments into documented parameter names and supply unique names without case collisions.
- Read-only responses or successful registration do not establish that a template has finished downloading and is ready. Production rollout still requires the test-account validation described in the post.
