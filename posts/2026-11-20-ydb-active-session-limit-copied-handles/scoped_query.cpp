// Source-reviewed for YDB C++ SDK v3.27.0. Caller owns the ready client.
#include <ydb-cpp-sdk/client/query/client.h>

bool RunScopedProbe(NYdb::NQuery::TQueryClient& client) {
    auto acquired = client.GetSession().GetValueSync();
    if (!acquired.IsSuccess()) return false;
    auto session = acquired.GetSession();
    auto result = session.ExecuteQuery(
        "SELECT 1 AS one;", NYdb::NQuery::TTxControl::NoTx(),
        NYdb::NQuery::TExecuteQuerySettings()
            .ClientTimeout(TDuration::Seconds(5))).GetValueSync();
    return result.IsSuccess();
    // result, session and acquired all leave scope before the caller continues.
}
