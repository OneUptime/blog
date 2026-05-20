# Validation Summary: How to Benchmark Ubuntu Server with Phoronix Test Suite

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- Phoronix Test Suite
- OpenBenchmarking.org
- Bash scripting
- Cron
- XML configuration

## Sources Consulted
- Phoronix Test Suite upstream documentation: https://github.com/phoronix-test-suite/phoronix-test-suite/blob/master/documentation/phoronix-test-suite.md
- Phoronix Test Suite upstream command source: https://github.com/phoronix-test-suite/phoronix-test-suite/tree/master/pts-core/commands
- Phoronix Test Suite default user configuration: https://github.com/phoronix-test-suite/phoronix-test-suite/blob/master/pts-core/static/user-config-defaults.xml
- Phoronix Test Suite environment variable documentation: https://github.com/phoronix-test-suite/phoronix-test-suite/blob/master/documentation/stubs/42_env_vars.html
- Phoronix Test Suite test-suite XML schema: https://github.com/phoronix-test-suite/phoronix-test-suite/blob/master/pts-core/openbenchmarking.org/schemas/test-suite.xsd
- OpenBenchmarking.org 7-Zip Compression profile: https://openbenchmarking.org/test/pts/compress-7zip
- OpenBenchmarking.org Blender profile: https://openbenchmarking.org/test/pts/blender
- OpenBenchmarking.org Phoronix Test Suite suite listings: https://openbenchmarking.org/suites/pts
- GitHub Phoronix Test Suite releases API: https://api.github.com/repos/phoronix-test-suite/phoronix-test-suite/releases/latest

## Issues Found
- The Blender benchmark was described as a BLAS/LAPACK linear algebra benchmark. Changed the description to Blender Cycles rendering benchmark because the OpenBenchmarking profile is for Blender rendering.
- The batch-mode environment variables `PHORONIX_BATCH_MODE` and `PHORONIX_BATCH_RESULT_SAVE_NAME` are not current documented PTS environment variables. Replaced them with `TEST_RESULTS_NAME`, which is documented for pre-filling the saved result file name.
- The custom suite creation command used `make-test-suite`, which is not a current PTS command. Changed it to `build-suite`.
- The custom suite XML used invalid suite metadata element names and grouped multiple `<Test>` entries inside one `<Execute>`. Updated it to use `Title`, `Version`, `TestType`, and `Description`, with one `<Execute>` block per test as required by the PTS test-suite schema.
- The result export comment said HTML but the command generated a PDF. Changed the command to `result-file-to-html`.
- The sample `user-config.xml` included `UsePhpCli`, which is not a current PTS user-config option, and `DefaultDisplayMode` was set to unsupported value `ALL_RESULTS`. Removed `UsePhpCli` and set `DefaultDisplayMode` to `DEFAULT`.

## Review Notes
The tutorial is technically relevant and broadly accurate after the fixes. Some benchmark runtime estimates can vary significantly by hardware and selected test options, but that is acceptable for a general guide.
