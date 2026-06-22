# Validation Summary: How to Handle JSON Parsing in Bash with jq

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Bash
- jq
- JSON
- curl
- Shell scripting
- API response handling

## Sources Consulted
- jq Manual: https://jqlang.org/manual/
- curl man page: https://curl.se/docs/manpage.html
- GNU Bash Reference Manual: https://www.gnu.org/s/bash/manual/bash.pdf
- Local jq 1.7 help output
- Local Bash 5.2 syntax/runtime checks
- Local curl 8.5.0 version/help output

## Issues Found
- The service summary jq filter did not compile because the `avg_response` field used a pipe expression without grouping inside the object literal. Changed it to `avg_response: ([.[] | select(.response_time != null) | .response_time] | add / length)` so jq treats the array pipeline as the field value expression.

## Review Notes
- The curl example uses `%{http_code}`, which is still accepted by curl. Current curl documentation also lists `%{response_code}` as the numerical response code variable and notes it was formerly known as `http_code`.
