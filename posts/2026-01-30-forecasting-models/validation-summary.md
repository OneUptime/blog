# Validation Summary: How to Build Forecasting Models

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Python
- pandas time series APIs
- NumPy
- statsmodels ARIMA and Augmented Dickey-Fuller test
- Prophet forecasting
- Mermaid diagrams
- Alerting integrations with Slack-style webhooks and PagerDuty-style Events API payloads

## Sources Consulted
- pandas 3.0.0 release notes: https://pandas.pydata.org/docs/whatsnew/v3.0.0.html
- pandas DataFrame.fillna API reference: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.fillna.html
- pandas time series user guide: https://pandas.pydata.org/docs/user_guide/timeseries.html
- statsmodels Augmented Dickey-Fuller API reference: https://www.statsmodels.org/dev/generated/statsmodels.tsa.stattools.adfuller.html
- statsmodels ARIMA API reference: https://www.statsmodels.org/stable/generated/statsmodels.tsa.arima.model.ARIMA.html
- statsmodels ARIMAResults.get_forecast API reference: https://www.statsmodels.org/stable/generated/statsmodels.tsa.arima.model.ARIMAResults.get_forecast.html
- Prophet quick start documentation: https://facebook.github.io/prophet/docs/quick_start.html
- Prophet non-daily data documentation: https://facebook.github.io/prophet/docs/non-daily_data.html

## Issues Found
- The post used `fillna(method='ffill')` and `fillna(method='bfill')`. The `method` keyword was deprecated in pandas 2.x and removed in pandas 3.0, so those examples would fail on current pandas. Changed them to `.ffill()` and `.bfill()`.
- The post used deprecated uppercase pandas frequency aliases such as `freq='H'` and examples like `'1H'` / `'15T'`. Updated hourly examples to lowercase `h`, changed the default resampling frequency to `1h`, and changed documentation examples to `15min` where appropriate.
- One Prophet example split training and test data with overlapping partial-date slices, so `2025-03-15` could appear in both train and test sets. Changed the training slice to end at `2025-03-14 23:00:00`.
- The stationarity section said most forecasting models assume stationarity. That is too broad for the post because Prophet is also discussed and does not require the same stationarity assumption as ARIMA-style classical models. Changed the statement to "Many classical forecasting models".

## Review Notes
The Python code blocks were syntax-checked with `python3` AST parsing. The local environment did not have pandas, statsmodels, or prophet installed, so full runtime execution of the forecasting examples was not possible here. The ARIMA, ADF, and Prophet API usage was checked against official documentation.
