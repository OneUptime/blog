# Validation Summary: How to Implement Authorization Model Design

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Authorization and access control
- Role-Based Access Control (RBAC)
- Attribute-Based Access Control (ABAC)
- Relationship-Based Access Control (ReBAC)
- PostgreSQL SQL schemas and queries
- Python dataclasses and type hints
- FastAPI route authorization
- HTTP 403/404 authorization responses

## Sources Consulted
- NIST Role Based Access Control project: https://csrc.nist.gov/projects/role-based-access-control
- NIST model for Role Based Access Control: https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=916402
- NIST SP 800-162, Guide to Attribute Based Access Control (ABAC): https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-162.pdf
- OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- Google Zanzibar paper page: https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/
- PostgreSQL CREATE TABLE documentation: https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL UUID type documentation: https://www.postgresql.org/docs/current/datatype-uuid.html
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- FastAPI HTTPException documentation: https://fastapi.tiangolo.com/tutorial/handling-errors/
- RFC 9110 HTTP Semantics, 403 and 404 status codes: https://datatracker.ietf.org/doc/html/rfc9110

## Issues Found
- The ReBAC example said Google Docs uses the model for sharing. Google's Zanzibar publication specifically names Drive among client services, so the sentence was changed to reference Google Drive and "this style of relationship-based authorization."
- The pitfalls section said authorization belongs in the service layer, "not your database queries or UI." This was too absolute because valid server-side enforcement can also happen in gateways, policy layers, serverless functions, or database-backed controls. The wording was changed to require server-side centralized enforcement and to warn against relying only on the UI.
- The audit logging guidance said to log every permission check and the conclusion said to "log everything." OWASP recommends choosing logging volume carefully because both too much and too little logging can be security weaknesses. The wording was changed to "security-relevant permission decisions," especially denials.

## Review Notes
The Python snippets were syntax-checked with `python3` using `ast.parse`. The SQL examples use PostgreSQL-compatible UUID, primary key, unique, foreign key, and SELECT EXISTS syntax. The FastAPI error-handling pattern using `HTTPException(status_code=403, ...)` is consistent with FastAPI and RFC 9110 guidance; the checklist correctly notes that 404 can be appropriate when hiding the existence of a forbidden resource.
