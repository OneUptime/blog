# Validation Summary: How to Use Format-Preserving Encryption with Cloud DLP for Tokenization

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Sensitive Data Protection / Cloud DLP
- Cloud DLP API
- Cloud KMS
- Python
- Google Cloud CLI
- Format-preserving encryption / FFX FPE tokenization

## Sources Consulted
- Google Cloud Sensitive Data Protection transformation reference: https://docs.cloud.google.com/sensitive-data-protection/docs/transformations-reference
- Google Cloud Sensitive Data Protection wrapped key guide: https://docs.cloud.google.com/sensitive-data-protection/docs/create-wrapped-key
- Google Cloud Python client reference for `CryptoReplaceFfxFpeConfig`: https://docs.cloud.google.com/python/docs/reference/dlp/latest/google.cloud.dlp_v2.types.CryptoReplaceFfxFpeConfig
- Google Cloud Sensitive Data Protection sample for de-identifying table data with FPE: https://docs.cloud.google.com/sensitive-data-protection/docs/samples/dlp-deidentify-table-fpe
- Google Cloud Sensitive Data Protection sample for re-identifying content encrypted by FPE: https://docs.cloud.google.com/sensitive-data-protection/docs/samples/dlp-reidentify-fpe
- Google Cloud client reference for `FfxCommonNativeAlphabet`: https://cloud.google.com/ruby/docs/reference/google-cloud-dlp-v2/latest/Google-Cloud-Dlp-V2-CryptoReplaceFfxFpeConfig-FfxCommonNativeAlphabet

## Issues Found
- The Python DLP examples passed the base64-encoded wrapped key string directly as `kms_wrapped.wrapped_key`. Google Cloud's Python examples and transformation reference state that the base64 value must be decoded to bytes before being sent to Sensitive Data Protection. Added `base64.b64decode(wrapped_key)` and passed `wrapped_key_bytes` in all DLP FPE config examples.
- The text and diagram examples used hyphenated credit card numbers with `common_alphabet: "NUMERIC"`. Since `NUMERIC` covers digits only, changed those examples to digit-only values.
- The structured table example transformed hyphenated SSNs with `common_alphabet: "NUMERIC"`. Changed the sample SSNs to 9-digit strings so they match the configured alphabet.
- The article described FPE as using FF1 or FF3-1, but Cloud DLP documents `CryptoReplaceFfxFpeConfig` as using FFX mode. Updated the wording to match the Cloud DLP documentation.
- The surrogate InfoType example did not explain that a surrogate annotation prefixes the token, which can break strict format preservation. Added a short code comment noting that the prefix should be omitted when strict format preservation is required.
- The alphabet guidance said the narrowest alphabet gives the strongest encryption. Reworded it to the technically safer requirement: choose an alphabet that covers every character in the transformed values.

## Review Notes
Cloud Data Loss Prevention is now part of Sensitive Data Protection, but the DLP API and Python package names remain in use. The tutorial's continued use of Cloud DLP terminology is acceptable, though a future editorial update could mention the product rename.
