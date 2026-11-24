# Validation summary

Reviewed on 25 November 2026.

## Source and executable review

Reviewed versioned scikit-learn pipeline, column transformation, unknown-category and persistence guidance; MLflow signatures and pinned 3.18.0 serialization source; and skops persistence documentation.

Executed both exact snippets with Python 3.11.13, MLflow 3.18.0, scikit-learn 1.9.1, pandas 3.1.1, NumPy 2.4.6 and skops 0.16.0. The entire fitted pipeline was registered in SQLite with local artifacts. Original, native, pyfunc and fresh-process predictions agreed within relative tolerance 1e-12. The fitted median remained 4.0, scaling state remained unchanged, unknown categories became zero one-hot columns, and column reordering preserved output. Missing columns and incompatible numeric input were rejected.

The initial default serialization check rejected numpy.dtype. The final example explicitly selects skops and narrowly trusts that reviewed type. Inspecting the saved artifact reported only numpy.dtype as requiring additional trust, and the saved requirements include pinned skops 0.16.0.

The five-node/four-edge diagram passed structural checking. The generated 1280x720 social image was opened and visually reviewed; its three-line title fits.

## Limits

No hosted inference platform, production dataset, model-quality evaluation or newly installed package environment was tested. Fresh-process loading reused the existing virtual environment. Direct requirements are pinned; transitive locking and runtime-image retention are separate production tasks. Type review was scoped to this constructed artifact. The Mermaid diagram was not browser-rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
