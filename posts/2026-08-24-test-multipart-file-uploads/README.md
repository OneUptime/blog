# How to Test Multipart Upload Limits, Types, and Partial Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, File Upload, Multipart Form Data, Playwright, Security, Reliability

Description: Test multipart uploads at byte boundaries, verify declared and detected media types, and prove cleanup or atomicity when parsing and storage fail.

---

Multipart upload bugs live at several boundaries at once: HTTP framing, part metadata, parser limits, temporary storage, media inspection, durable object storage, and application transactions. A happy-path test with one tiny text file proves little about those boundaries.

A strong suite defines the upload contract, generates valid multipart bodies with a trusted client, uses a raw-body client for malformed framing, and inspects both the response and every resulting side effect.

## Know What `multipart/form-data` Guarantees

RFC 7578 defines the wire format. The request `Content-Type` includes a required boundary parameter, and each form part uses `Content-Disposition: form-data` with a `name` parameter. File parts normally also carry a `filename` parameter and should have an appropriate part `Content-Type` when known.

For multiple files under one form field, RFC 7578 says to send each file as a separate part with the same `name`; the older nested `multipart/mixed` method is deprecated. Intermediaries must not reorder fields, and duplicate field names must not be coalesced.

The RFC does **not** define your application's maximum size, allowed media types, virus-scanning policy, storage atomicity, or partial-success response. Those must be documented by the API and tested as application behavior.

## Generate Valid Bodies with the Client Library

Playwright's `APIRequestContext` supports a `FormData` value through the `multipart` option. Let it generate the boundary and top-level `Content-Type`; manually setting `Content-Type: multipart/form-data` without the generated boundary commonly creates an invalid request.

```ts
import { test, expect } from '@playwright/test';

test('uploads a PDF with metadata', async ({ request }) => {
  const form = new FormData();
  form.set('title', 'Quarterly report');
  form.append(
    'files',
    new File([Buffer.from('%PDF-1.7\n% test fixture')], 'report.pdf', {
      type: 'application/pdf',
    })
  );

  const response = await request.post('/v1/uploads', { multipart: form });
  expect(response.status()).toBe(201);

  const body = await response.json();
  expect(body.files).toHaveLength(1);
  expect(body.files[0]).toMatchObject({ originalName: 'report.pdf', mediaType: 'application/pdf' });
});
```

The bytes are deliberately a fixture, not a real PDF for rendering. If the service performs deep format validation, use a minimal valid file from a reviewed test asset and separately test malformed claimed PDFs.

To send multiple files for one field:

```ts
const form = new FormData();
form.append('files', new File([Buffer.from('one')], 'one.txt', { type: 'text/plain' }));
form.append('files', new File([Buffer.from('two')], 'two.txt', { type: 'text/plain' }));
```

Assert the service preserves both parts and the documented order. Do not convert repeated fields into an object map in the test helper, because that can erase the very behavior being tested.

## Test Exact Size Boundaries

Clarify which limit the API publishes:

- bytes in one file part;
- decoded file bytes;
- total bytes across all file parts;
- complete HTTP request size including multipart overhead;
- number of parts or files; or
- a combination.

Then generate exact buffers at `limit - 1`, `limit`, and `limit + 1`:

```ts
function bytes(size: number): Buffer {
  return Buffer.alloc(size, 0x61);
}

async function upload(request, size: number) {
  return request.post('/v1/uploads', {
    multipart: {
      file: { name: `file-${size}.bin`, mimeType: 'application/octet-stream', buffer: bytes(size) },
    },
    failOnStatusCode: false,
  });
}

expect((await upload(request, LIMIT - 1)).status()).toBe(201);
expect((await upload(request, LIMIT)).status()).toBe(201);       // if the limit is inclusive
expect((await upload(request, LIMIT + 1)).status()).toBe(413);  // contract-specific response
```

RFC 9110 defines `413 Content Too Large`; use it if that is the API contract. Verify the error body identifies the applicable limit safely and that no durable object, metadata row, thumbnail, scan job, or event remains from the rejected request.

Test aggregate size independently: two individually valid files may exceed the total. Also test file count, zero-byte files, long text fields, and multipart overhead near a request-level gateway limit. A reverse proxy may reject the full request before the application sees the file, so run a small integration tier through the production-shaped gateway.

Avoid allocating multi-gigabyte buffers in normal CI. Configure a small test limit for component coverage and use sparse or streamed fixtures only in a controlled integration environment. Ensure test tooling's own request limit is above the case being sent.

## Separate Declared Type from Actual Content

The part `Content-Type` is supplied by the client and is not proof of file contents. Test at least:

| Filename | Declared type | Bytes | Expected policy |
| --- | --- | --- | --- |
| `photo.png` | `image/png` | valid PNG | accept |
| `photo.png` | `text/plain` | valid PNG | reject or normalize as documented |
| `notes.txt` | `image/png` | text | reject |
| `payload` | omitted/default | arbitrary bytes | follow documented default policy |
| `archive.zip` | `application/octet-stream` | valid ZIP | accept only if generic type is allowed |

RFC 7578 says a part without `Content-Type` defaults to `text/plain`; for file contents, `application/octet-stream` is appropriate when the type is unknown. The application may impose stricter rules.

If the service performs signature or magic-byte detection, assert the detected type, not only the declared type. If it performs a full decoder or antivirus scan asynchronously, distinguish upload acceptance from later quarantine or rejection. Never execute or render untrusted fixtures during a unit test.

RFC 9110 defines `415 Unsupported Media Type` for refusing a request because its content format is unsupported; the cause can be the indicated `Content-Type` or `Content-Encoding`, or direct inspection of the data. Document whether the API returns it for an unsupported top-level request media type, an unsupported file part detected within the multipart body, or both. Assert the service's published mapping rather than assuming all part errors are `415`.

## Define Partial-Failure Semantics

For a request containing several files, choose and document one model.

### Atomic batch

If any part fails validation or storage, none of the files becomes visible. The test should place a valid file before and after an invalid one and force failure at each stage:

```text
valid A -> invalid B -> valid C
```

Assert zero durable objects, zero metadata rows, no downstream events, and cleanup of temporary files and incomplete multipart uploads. Retrying the corrected request should work without colliding with debris.

### Per-file result

The response identifies success or failure for every input part with a stable client item ID. Assert that only successful files are visible and that the response unambiguously maps repeated `files` parts to results. HTTP does not prescribe a universal partial-upload status or body; define it in the API contract rather than assuming `207` or `200` has generic multipart semantics.

In both models, test a storage failure after bytes were written but before metadata commit, a metadata failure after object upload, scanner timeout, checksum mismatch, client disconnect, and process restart. The cleanup path is part of correctness.

## Test Malformed Multipart Framing Separately

High-level `FormData` libraries intentionally create valid bodies. Use a low-level HTTP client or raw socket fixture when you need byte-for-byte control over malformed framing and parser-edge cases:

- missing boundary parameter;
- header boundary different from body delimiter;
- missing final closing delimiter;
- truncated part body;
- malformed `Content-Disposition`;
- part without required `name`;
- repeated field names to verify order preservation and non-coalescing;
- excessive part headers or part count;
- forbidden or deprecated part headers; and
- near-miss boundary-like byte sequences that are not valid delimiter lines inside file content.

RFC 7578 says senders should not generate `Content-Transfer-Encoding` for multipart parts in HTTP contexts. It supports only `Content-Disposition`, optional `Content-Type`, and, in limited circumstances, `Content-Transfer-Encoding`; other part header fields must not be included and receivers must ignore them. Test that unsupported well-formed headers are ignored safely, while malformed header syntax is handled without crashing.

These tests must bypass any helper that silently repairs the body. Cap the bytes and time for every malformed request so a parser waiting for a delimiter cannot hang CI.

## Test Filenames as Untrusted Input

RFC 7578 warns receivers not to overwrite local files based on supplied filenames. Include:

- `../../target` and Windows path separators;
- absolute paths;
- empty and extremely long names;
- control characters and Unicode normalization variants;
- duplicate filenames; and
- names containing quotes or boundary-looking text.

The service should generate its own storage key, retain a sanitized display name only as needed, and never allow the client filename to choose a filesystem path. Assert no file appears outside the test storage root and no existing object is overwritten.

## Verify Streaming and Cleanup

At the HTTP/1.1 layer, run cases with `Content-Length` and with `Transfer-Encoding: chunked` if the supported stack allows it. For HTTP/2 or HTTP/3, test requests without `Content-Length`; those versions delimit content with frames rather than chunked transfer coding. Playwright's `APIRequestContext` buffers and serializes multipart bodies before sending them and sets `Content-Length`, so use a streaming-capable low-level client for chunked or genuinely streamed cases. Verify the service enforces limits while streaming rather than buffering an unlimited body first. A rejection should stop reading or drain safely according to server/framework needs and release temporary resources.

Expose test diagnostics such as sanitized original name, bytes accepted, failure phase, storage object count, and cleanup result. Do not attach uploaded confidential data to CI reports. Hash fixture contents when identity evidence is sufficient.

## Official Documentation

- [RFC 7578: `multipart/form-data`](https://www.rfc-editor.org/rfc/rfc7578.html)
- [RFC 9110: 413 Content Too Large](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.14)
- [RFC 9110: 415 Unsupported Media Type](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.16)
- [Playwright APIRequestContext multipart option](https://playwright.dev/docs/api/class-apirequestcontext#api-request-context-post)
- [OpenAPI 3.2 multipart encoding](https://spec.openapis.org/oas/v3.2.0.html#encoding-multipart-media-types)

## Conclusion

Multipart tests must cover wire framing, exact byte limits, declared versus detected content, repeated parts, storage failures, and cleanup. Use a high-level client for valid bodies, a raw client for malformed framing, and authoritative storage inspection for every failure. Most importantly, document whether a multi-file request is atomic or partially successful before encoding the expectation.
