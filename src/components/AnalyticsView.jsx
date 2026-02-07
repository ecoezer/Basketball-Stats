import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Cell, PieChart, Pie
} from 'recharts';

const AnalyticsView = ({ matches, strategy }) => {
    // 1. Calculate Team Stats
    const teamStats = {};
    matches.filter(m => {
        const quote = strategy === 'over' ? m.ustQuote : m.altQuote;
        return m.status === 'MS' && quote && quote !== 'TBD';
    }).forEach(m => {
        const processTeam = (teamName) => {
            if (!teamStats[teamName]) {
                teamStats[teamName] = { name: teamName, investment: 0, returns: 0, winCount: 0, totalCount: 0 };
            }
            teamStats[teamName].totalCount += 1;
            teamStats[teamName].investment += 100;

            const isWin = strategy === 'over' ? m.result === 'Over' : m.result === 'Under';
            const quote = strategy === 'over' ? parseFloat(m.ustQuote) : parseFloat(m.altQuote);

            if (isWin) {
                teamStats[teamName].winCount += 1;
                teamStats[teamName].returns += (100 * quote);
            }
        };
        processTeam(m.homeTeam);
        processTeam(m.awayTeam);
    });

    const rankedTeams = Object.values(teamStats).map(t => ({
        ...t,
        profit: (t.returns - t.investment),
        winRate: (t.winCount / t.totalCount) * 100
    })).sort((a, b) => b.profit - a.profit);

    const topProfitable = rankedTeams.slice(0, 5);
    const worstProfitable = [...rankedTeams].sort((a, b) => a.profit - b.profit).slice(0, 5);
    const bestWinRate = [...rankedTeams].sort((a, b) => b.winRate - a.winRate).slice(0, 5);

    // 2. Weekly Performance
    const weekStats = {};
    matches.filter(m => {
        const quote = strategy === 'over' ? m.ustQuote : m.altQuote;
        return m.status === 'MS' && quote && quote !== 'TBD';
    }).forEach(m => {
        if (!weekStats[m.week]) {
            weekStats[m.week] = { week: m.week, profit: 0, winCount: 0, total: 0 };
        }
        weekStats[m.week].total += 1;

        const isWin = strategy === 'over' ? m.result === 'Over' : m.result === 'Under';
        const quote = strategy === 'over' ? parseFloat(m.ustQuote) : parseFloat(m.altQuote);

        if (isWin) {
            weekStats[m.week].winCount += 1;
            weekStats[m.week].profit += (100 * quote - 100);
        } else {
            weekStats[m.week].profit -= 100;
        }
    });

    const weeklyData = Object.values(weekStats).sort((a, b) => a.week - b.week);

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Top Cards: BEST / WORST / MOST PROFITABLE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-6 rounded-[32px] backdrop-blur-xl border ${strategy === 'over' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-blue-500/10 border-blue-500/20'
                    }`}>
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${strategy === 'over' ? 'text-emerald-500' : 'text-blue-500'
                        }`}>Most Profitable</span>
                    <h4 className="text-2xl font-black text-white mt-1 ">{topProfitable[0]?.name}</h4>
                    <p className={`font-black text-xl mt-2 ${topProfitable[0]?.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                        {topProfitable[0]?.profit > 0 ? '+' : ''}{topProfitable[0]?.profit.toFixed(2)}€
                    </p>
                </div>

                <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-[32px] backdrop-blur-xl">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">Worst Performer</span>
                    <h4 className="text-2xl font-black text-white mt-1 ">{worstProfitable[0]?.name}</h4>
                    <p className="text-rose-400 font-black text-xl mt-2">{worstProfitable[0]?.profit.toFixed(2)}€</p>
                </div>

                <div className={`p-6 rounded-[32px] backdrop-blur-xl border ${strategy === 'over' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${strategy === 'over' ? 'text-blue-500' : 'text-emerald-500'
                        }`}>Highest Win Rate</span>
                    <h4 className="text-2xl font-black text-white mt-1 ">{bestWinRate[0]?.name}</h4>
                    <p className={`font-black text-xl mt-2 ${strategy === 'over' ? 'text-blue-400' : 'text-emerald-400'
                        }`}>%{bestWinRate[0]?.winRate.toFixed(1)}</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profit by Week Chart */}
                <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[40px] h-[400px]">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Season Profit Trend (€)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyData}>
                            <XAxis dataKey="week" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                            />
                            <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                                {weeklyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#f43f5e'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top 5 Profitable Teams */}
                <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[40px] h-[400px]">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Top 5 Profitable Teams</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topProfitable} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} axisLine={false} tickLine={false} width={100} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                            />
                            <Bar dataKey="profit" fill={strategy === 'over' ? '#10b981' : '#3b82f6'} radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Weekly Breakdown Table */}
            <div className="bg-white/[0.03] border border-white/10 rounded-[40px] overflow-hidden">
                <div className="px-8 py-6 border-b border-white/5 bg-white/5">
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Weekly Performance Summary</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.01]">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Week</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Matches</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{strategy === 'over' ? 'Over' : 'Under'} Wins</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Profit (€)</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {weeklyData.map((w) => (
                                <tr key={w.week} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-4 text-xs font-bold text-white">Week {w.week}</td>
                                    <td className="px-8 py-4 text-xs font-bold text-slate-400">{w.total}</td>
                                    <td className="px-8 py-4 text-xs font-bold text-emerald-400">{w.winCount}</td>
                                    <td className={`px-8 py-4 text-xs font-bold ${w.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {w.profit.toFixed(2)}€
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className={`text-[9px] font-black px-2 py-1 rounded-full ${w.profit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                            {w.profit >= 0 ? 'POSITIVE' : 'NEGATIVE'}
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

export default AnalyticsView;
