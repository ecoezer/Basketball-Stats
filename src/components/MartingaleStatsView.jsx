import React, { useMemo } from 'react';

const MartingaleStatsView = ({ matches, teams, getMartingaleReport }) => {
    const stats = useMemo(() => {
        return teams.map(team => {
            const report = getMartingaleReport(team);
            return {
                team,
                totalWagered: parseFloat(report.totalInvestment),
                totalReturns: parseFloat(report.totalReturns),
                netProfit: parseFloat(report.netProfit),
                maxStreak: report.maxStreak,
                historyLength: report.history.length
            };
        }).sort((a, b) => b.netProfit - a.netProfit);
    }, [teams, getMartingaleReport]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 md:p-12">
                <div className="relative z-10 max-w-2xl">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-4 block">Strategy Overview</span>
                    <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-6">
                        Global Martingale <span className="text-emerald-500">Analysis</span>
                    </h2>
                    <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-lg">
                        A comprehensive league-wide audit of the +50€ Profit Goal strategy. Analyze risk,
                        recovery streaks, and total bankroll performance across all 28 weeks.
                    </p>
                </div>
                <div className="absolute right-[-10%] top-[-20%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
            </div>

            {/* Stats Table */}
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0f1a]/50 backdrop-blur-2xl transition-all duration-500 hover:border-emerald-500/20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rank</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Team</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Games</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Worst Streak</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Total Wagered</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Net Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-sans">
                            {stats.map((row, idx) => (
                                <tr key={row.team} className="group hover:bg-white/[0.03] transition-all duration-300">
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black ${idx === 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                                                idx < 3 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                                                    'bg-white/5 text-slate-500 border border-white/5'
                                            }`}>
                                            #{idx + 1}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{row.team}</span>
                                            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">EuroLeague Participant</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className="text-xs font-bold text-slate-400">{row.historyLength}</span>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${row.maxStreak >= 5 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10' :
                                                row.maxStreak >= 3 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' :
                                                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                                            }`}>
                                            {row.maxStreak} L
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right font-mono text-xs text-slate-300">
                                        {row.totalWagered.toLocaleString()}€
                                    </td>
                                    <td className="px-6 py-5 text-right font-mono">
                                        <span className={`text-sm font-black ${row.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {row.netProfit > 0 ? '+' : ''}{row.netProfit.toLocaleString()}€
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MartingaleStatsView;
