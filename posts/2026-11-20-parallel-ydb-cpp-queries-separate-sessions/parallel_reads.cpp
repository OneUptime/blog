// Source-reviewed for YDB C++ SDK v3.27.0. Caller owns the ready client.
#include "drain_futures.h"
#include <stdexcept>
#include <ydb-cpp-sdk/client/query/client.h>

bool RunIndependentReads(NYdb::NQuery::TQueryClient& client) {
    using namespace NYdb::NQuery;
    auto first = client.GetSession().GetValueSync();
    if (!first.IsSuccess()) return false;
    auto second = client.GetSession().GetValueSync();
    if (!second.IsSuccess()) return false;
    auto a = first.GetSession();
    auto b = second.GetSession();
    if (a.GetId() == b.GetId()) throw std::logic_error("Sessions must differ");
    auto settings = TExecuteQuerySettings().ClientTimeout(TDuration::Seconds(2));
    std::vector<TAsyncExecuteQueryResult> pending;
    pending.reserve(2);
    std::exception_ptr launchFailure;
    try {
        pending.push_back(a.ExecuteQuery("SELECT 1 AS one;", TTxControl::NoTx(), settings));
        pending.push_back(b.ExecuteQuery("SELECT 2 AS two;", TTxControl::NoTx(), settings));
    } catch (...) {
        launchFailure = std::current_exception();
    }
    return DrainAll(pending, launchFailure);
}
