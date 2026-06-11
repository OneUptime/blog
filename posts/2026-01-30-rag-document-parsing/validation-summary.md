# Validation Summary: How to Create Document Parsing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LlamaIndex (`SimpleDirectoryReader`, `SentenceSplitter`)
- PyMuPDF (`fitz`)
- Unstructured (`partition`, `partition_pdf`, `chunk_by_title`)
- python-docx
- BeautifulSoup4 (`bs4`)
- pytesseract / Tesseract OCR
- pdf2image (`convert_from_path`)
- Pillow (PIL)
- NumPy (Otsu's method implementation)
- Python dataclasses / typing

## Sources Consulted
- LlamaIndex `SentenceSplitter` API reference: https://developers.llamaindex.ai/python/framework-api-reference/node_parsers/sentence_splitter/
- PyMuPDF documentation (vars, page, document): https://pymupdf.readthedocs.io/en/latest/
- Unstructured partitioning docs: https://docs.unstructured.io/open-source/core-functionality/partitioning
- Unstructured chunking docs: https://docs.unstructured.io/open-source/core-functionality/chunking
- Tesseract Command-Line Usage: https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage.html
- Pillow 9.1.0 release notes (LANCZOS Resampling enum): https://pillow.readthedocs.io/en/stable/releasenotes/9.1.0.html
- python-docx documentation: https://python-docx.readthedocs.io/
- BeautifulSoup4 documentation: https://www.crummy.com/software/BeautifulSoup/bs4/doc/

## Issues Found
1. **LlamaIndex `SentenceSplitter` unit mismatch.** The inline comments described `chunk_size=1024` and `chunk_overlap=200` as "characters", but per the LlamaIndex source/docs both parameters are measured in **tokens** (the splitter calls a tokenizer to count them). Updated the two comments to say "tokens" so readers don't mis-size their chunks.

2. **Invalid `include_metadata=True` argument to `partition_pdf`.** This is not a documented parameter of `unstructured.partition.pdf.partition_pdf`; element metadata (including coordinates) is captured automatically. Removed the argument and its misleading "Include coordinates for each element" comment.

3. **Incorrect access to chunk constituents in `create_semantic_chunks`.** The original code used `chunk.elements` (guarded by `hasattr`), which always falls back to `[]` because `chunk_by_title` returns `CompositeElement`s that expose their original elements via `chunk.metadata.orig_elements`. Updated the code to read `chunk.metadata.orig_elements` so the `element_types` list is actually populated.

## Review Notes
- The `clean_ocr_text` function declares a `replacements` dict but never applies it. The function still works (whitespace cleanup and short-line filtering run as written), and the author may have left it as a "common mistakes" reference list — left as-is, but worth wiring up or removing in a future revision.
- The `chunk_by_title` call passes `max_characters == new_after_n_chars`, which collapses the hard/soft thresholds into a single value. Functionally fine, but the two parameters are usually set independently (e.g., `new_after_n_chars` lower than `max_characters`).
- The `DocxElement` dataclass uses `metadata: dict = None` without an `Optional[dict]` annotation; this works at runtime but is type-inconsistent. Stylistic, not technical.
- PyMuPDF `flags=fitz.TEXT_PRESERVE_WHITESPACE`, `page.rotation`, `page.get_images()[0] == xref`, and `Document.extract_image(xref)` all verified against current PyMuPDF docs.
- Tesseract `--psm 1 --oem 3` and `pytesseract.image_to_data(..., Output.DICT)` returning a `"conf"` key are both confirmed against the Tesseract command-line docs.
- `Image.Resampling.LANCZOS` is the correct modern API; the bare `Image.LANCZOS` constant was removed in Pillow 10.0 (2023), so the post is up to date.
