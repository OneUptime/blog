# Validation Summary: How to Build Text Extraction

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python 3
- PyMuPDF (fitz) — native PDF text extraction
- pytesseract / Tesseract OCR — OCR for images and scanned PDFs
- pdf2image (poppler) — PDF page rasterization
- OpenCV (opencv-python) — image preprocessing (denoising, CLAHE, adaptive threshold, Hough transform, contours)
- Pillow (PIL)
- Camelot (camelot-py) — table extraction (lattice/stream)
- pdfplumber — fallback table extraction
- pandas — DataFrame/table handling
- BeautifulSoup (bs4) — hOCR parsing
- Mermaid — diagrams
- RAG (Retrieval Augmented Generation) — chunking for vector embedding

## Sources Consulted
- Tesseract documentation — PSM and OEM modes (https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html and `tesseract --help-extra`)
- PyMuPDF docs — Document/Page/get_text/is_encrypted/authenticate (https://pymupdf.readthedocs.io/)
- pytesseract docs — `image_to_data`, `image_to_pdf_or_hocr`, `Output.DICT` (https://github.com/madmaze/pytesseract)
- pdf2image docs — `convert_from_path` parameters including `dpi`, `fmt`, `thread_count` (https://github.com/Belval/pdf2image)
- OpenCV docs — `fastNlMeansDenoising`, `createCLAHE`, `adaptiveThreshold`, `Canny`, `HoughLinesP`, `findContours` (4.x returns 2 values), `getRotationMatrix2D`, `warpAffine` (https://docs.opencv.org/)
- Camelot docs — `read_pdf` with `flavor`, `pages`, `suppress_stdout`; Table attributes `.df`, `.accuracy`, `.page` (https://camelot-py.readthedocs.io/)
- pdfplumber docs — `open`, `pages`, `extract_tables` (https://github.com/jsvine/pdfplumber)
- pandas docs — `to_dict('records')`, `to_markdown` (requires `tabulate`), `to_csv`

## Issues Found
- **OEM 3 description was incorrect.** The code comment said `oem: OCR engine mode (default: 3 - LSTM only)`. Per Tesseract's `--help-extra`, OEM 3 is "Default, based on what is available" — OEM 1 is the "Neural nets LSTM engine only" mode. Changed the description to `(default: 3 - Default, based on what is available)`.

## Review Notes
- The PSM modes dictionary in `OCRExtractor.PSM_MODES` is intentionally partial (omits 2, 5, 8, 9, 10, 13). That is not an error but a documentation choice; the values that are listed are accurate.
- `pandas.DataFrame.to_markdown()` requires the optional `tabulate` package, which is not listed in the install commands. Users following the install instructions verbatim will hit an `ImportError` when calling `to_markdown` in the table extractor. Not changed (would be content addition), but worth mentioning in a follow-up.
- `cv2.findContours` returns `(contours, hierarchy)` in OpenCV 4.x. The post uses the 2-tuple unpacking, which is correct for current OpenCV versions but would break on 3.x. Fine for current installs.
- `hashlib.md5` in `ExtractedText.content_hash` is used for deduplication, not security. On Python 3.9+ on FIPS-restricted systems, passing `usedforsecurity=False` would be safer, but the current code works on standard installs.
- The `char_start`/`char_end` tracking in `_chunk_text` is approximate — the recomputation after creating an overlap chunk does not accurately reflect the original document offset. This is metadata rather than core extraction logic, so it does not affect chunk content or RAG behavior; left unchanged.
- `pytesseract.image_to_data` returns `conf` values as strings in recent releases; `int(data['conf'][i])` handles this correctly. Confidence of `-1` (returned for non-text rows) is filtered by the `conf > 0` check, which is appropriate.
- `camelot.read_pdf`'s `suppress_stdout` parameter is valid in current Camelot releases.
- The `tempfile` and `os` imports in `ocr_extractor.py` are unused; harmless but could be cleaned up.
