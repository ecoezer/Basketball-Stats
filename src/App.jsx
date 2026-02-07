import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

import AnalyticsView from './components/AnalyticsView';
import MartingaleStatsView from './components/MartingaleStatsView';

const App = () => {
  const [matches, setMatches] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [profitTeam, setProfitTeam] = useState("");
  const [martingaleTeam, setMartingaleTeam] = useState("");
  const [view, setView] = useState("fixture"); // 'fixture' or 'analytics'
  const weeks = Array.from({ length: 28 }, (_, i) => i + 1);

  // Extract unique teams from matches
  const teams = [...new Set(matches.flatMap(m => [m.homeTeam, m.awayTeam]))]
    .filter(Boolean)
    .sort();

  useEffect(() => {
    const q = query(collection(db, "matches"), orderBy("matchTimestamp", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const matchesData = [];
      querySnapshot.forEach((doc) => {
        matchesData.push({ id: doc.id, ...doc.data() });
      });
      setMatches(matchesData);
    });

    return () => unsubscribe();
  }, []);

  const displayMatches = selectedTeam
    ? matches.filter(match => match.homeTeam === selectedTeam || match.awayTeam === selectedTeam)
    : matches.filter(match => match.week === selectedWeek);

  // Profit Calculation Logic
  const getProfitReport = (teamName) => {
    const teamMatches = matches.filter(m => m.homeTeam === teamName || m.awayTeam === teamName);
    const finishedMatches = teamMatches.filter(m => m.status === 'MS' && m.ustQuote && m.ustQuote !== 'TBD');

    const investment = finishedMatches.length * 100;
    const returns = finishedMatches.reduce((total, m) => {
      if (m.result === 'Over') {
        return total + (100 * parseFloat(m.ustQuote));
      }
      return total;
    }, 0);

    return {
      count: finishedMatches.length,
      investment: investment.toFixed(2),
      returns: returns.toFixed(2),
      profit: (returns - investment).toFixed(2),
      winCount: finishedMatches.filter(m => m.result === 'Over').length,
      lossCount: finishedMatches.filter(m => m.result === 'Under').length
    };
  };

  const profitReport = profitTeam ? getProfitReport(profitTeam) : null;

  // Martingale Strategy Logic
  const getMartingaleReport = (teamName) => {
    const teamMatches = matches.filter(m => m.homeTeam === teamName || m.awayTeam === teamName)
      .sort((a, b) => a.matchTimestamp - b.matchTimestamp);

    // Only process matches with valid odds
    const validMatches = teamMatches.filter(m => m.status === 'MS' && m.ustQuote && m.ustQuote !== 'TBD');

    let currentStreakCount = 0;
    let accumulatedLoss = 0;
    let history = [];
    let totalInvestment = 0;
    let totalReturns = 0;

    validMatches.forEach((m) => {
      const quote = parseFloat(m.ustQuote);
      let stake = 0;
      let isCapped = false;

      const opponentName = m.homeTeam === teamName ? m.awayTeam : m.homeTeam;

      // Find opponent's last result before this match
      const opponentMatches = matches.filter(match => match.homeTeam === opponentName || match.awayTeam === opponentName)
        .sort((a, b) => a.matchTimestamp - b.matchTimestamp);

      // Find the most recent match for opponent that happened before current match time
      const lastOpponentMatch = [...opponentMatches].reverse().find(match =>
        match.matchTimestamp < m.matchTimestamp && match.status === 'MS'
      );
      const opponentWonLast = lastOpponentMatch?.result === 'Over';

      if (accumulatedLoss === 0) {
        stake = 100;
      } else {
        // Martingale Goal: Win covers all previous losses plus 50€ extra profit
        // CurrentStake * (Quote - 1) = AccumulatedLoss + 50
        // CurrentStake = (50 + AccumulatedLoss) / (Quote - 1)
        stake = (50 + accumulatedLoss) / (quote - 1);

        // Safety Valve: If opponent is NOT on a losing streak (they won last game), cap at 100
        if (opponentWonLast) {
          stake = 100;
          isCapped = true;
        }
      }

      // Safety: minimum 100€
      stake = Math.max(stake, 100);

      const isWin = m.result === 'Over';
      const winAmount = isWin ? (stake * quote) : 0;

      totalInvestment += stake;
      totalReturns += winAmount;

      history.push({
        week: m.week,
        date: m.date,
        opponent: m.homeTeam === teamName ? m.awayTeam : m.homeTeam,
        quote: quote.toFixed(2),
        stake: stake.toFixed(2),
        result: m.result,
        win: isWin,
        isCapped,
        winAmount: winAmount.toFixed(2),
        netProfit: (totalReturns - totalInvestment).toFixed(2)
      });

      if (isWin) {
        accumulatedLoss = 0;
        currentStreakCount = 0;
      } else {
        accumulatedLoss += stake;
        currentStreakCount += 1;
      }
    });

    return {
      history,
      totalInvestment: totalInvestment.toFixed(2),
      totalReturns: totalReturns.toFixed(2),
      netProfit: (totalReturns - totalInvestment).toFixed(2),
      maxStreak: Math.max(...history.map((_, i) => {
        let streak = 0;
        let j = i;
        while (j >= 0 && !history[j].win) {
          streak++;
          j--;
        }
        return streak;
      }), 0)
    };
  };

  const martingaleReport = martingaleTeam ? getMartingaleReport(martingaleTeam) : null;

  // Group matches by date
  const groupedMatches = displayMatches.reduce((groups, match) => {
    const date = match.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(match);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-[#0b0f1a] p-4 md:p-8 text-white font-sans">
      <header className="mb-12 flex flex-col items-center">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
            <span className="text-2xl">🏀</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">EuroLeague</h1>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] leading-none mt-1">Over/Under Tracker</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-xl">
          <button
            onClick={() => setView('fixture')}
            className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-500 ${view === 'fixture'
                ? 'bg-white text-[#0b0f1a] shadow-[0_0_40px_rgba(255,255,255,0.2)]'
                : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
          >
            Live Fixture
          </button>
          <button
            onClick={() => setView('analytics')}
            className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-500 ${view === 'analytics'
                ? 'bg-white text-[#0b0f1a] shadow-[0_0_40px_rgba(255,255,255,0.2)]'
                : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
          >
            Analytics Dashboard
          </button>
          <button
            onClick={() => setView('martingale-stats')}
            className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-500 ${view === 'martingale-stats'
                ? 'bg-white text-[#0b0f1a] shadow-[0_0_40px_rgba(255,255,255,0.2)]'
                : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
          >
            Martingale Stats
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl">
        {view === 'fixture' ? (
          <>
            {/* Selectors */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-4">
              {/* Week Selector Dropdown */}
              <div className="relative group">
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Season Week</label>
                <select
                  value={selectedWeek}
                  onChange={(e) => {
                    setSelectedWeek(Number(e.target.value));
                    setSelectedTeam("");
                    setProfitTeam("");
                    setMartingaleTeam("");
                  }}
                  className="appearance-none w-full bg-white/10 text-slate-200 px-6 py-3 rounded-xl font-bold border border-white/10 focus:border-blue-500/50 focus:outline-none transition-all duration-300 hover:bg-white/15 cursor-pointer text-center tracking-widest uppercase text-[10px]"
                >
                  {weeks.map((week) => (
                    <option key={week} value={week} className="bg-[#0f172a] text-white">
                      Week {week}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-slate-600 font-extrabold text-[9px] uppercase tracking-widest hidden md:block opacity-40 mt-6">OR</div>

              {/* Team Selector Dropdown */}
              <div className="relative group">
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Match History</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => {
                    setSelectedTeam(e.target.value);
                    setProfitTeam(""); // Clear profit view when browsing history
                    setMartingaleTeam("");
                  }}
                  className="appearance-none w-full bg-white/10 text-slate-200 px-6 py-3 rounded-xl font-bold border border-white/10 focus:border-indigo-500/50 focus:outline-none transition-all duration-300 hover:bg-white/15 cursor-pointer text-center tracking-widest uppercase text-[10px]"
                >
                  <option value="" className="bg-[#0f172a] text-slate-400">Browse Team History</option>
                  {teams.map((team) => (
                    <option key={team} value={team} className="bg-[#0f172a] text-white">
                      {team}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-slate-600 font-extrabold text-[9px] uppercase tracking-widest hidden md:block opacity-40 mt-6">OR</div>

              {/* Martingale Selector Dropdown */}
              <div className="relative group">
                <label className="block text-[9px] font-black text-emerald-500/70 uppercase tracking-widest mb-2 ml-1">Martingale Analysis</label>
                <select
                  value={martingaleTeam}
                  onChange={(e) => {
                    setMartingaleTeam(e.target.value);
                    setSelectedTeam("");
                    setProfitTeam("");
                  }}
                  className="appearance-none w-full bg-emerald-500/10 text-emerald-200 px-6 py-3 rounded-xl font-bold border border-emerald-500/20 focus:border-emerald-500/50 focus:outline-none transition-all duration-300 hover:bg-emerald-500/20 cursor-pointer text-center tracking-widest uppercase text-[10px]"
                >
                  <option value="" className="bg-[#0f172a] text-slate-400">Martingale Strategy</option>
                  {teams.map((team) => (
                    <option key={team} value={team} className="bg-[#0f172a] text-white">
                      {team}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Martingale Strategy Report */}
            {martingaleReport && (
              <div className="mb-10 space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
                {/* Summary Card */}
                <div className="overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent backdrop-blur-2xl p-6 md:p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Advanced Martingale (+50€ Goal)</span>
                      <h3 className="text-3xl md:text-4xl font-black text-white mt-1 uppercase tracking-tighter">{martingaleTeam}</h3>
                      <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest">Worst Streak: {martingaleReport.maxStreak} Consecutive Losses</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full md:w-auto">
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Wagered</p>
                        <p className="text-xl font-black text-white">{martingaleReport.totalInvestment}€</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Returns</p>
                        <p className="text-xl font-black text-white">{martingaleReport.totalReturns}€</p>
                      </div>
                      <div className={`p-4 rounded-2xl border col-span-2 md:col-span-1 shadow-lg ${parseFloat(martingaleReport.netProfit) >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 shadow-emerald-500/10' : 'bg-rose-500/10 border-rose-500/30 shadow-rose-500/10'}`}>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 opacity-70">Martingale Profit</p>
                        <p className={`text-2xl font-black ${parseFloat(martingaleReport.netProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {parseFloat(martingaleReport.netProfit) > 0 ? '+' : ''}{martingaleReport.netProfit}€
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progression Table */}
                <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                          <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Week</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">VS</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Quote</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Stake</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Result</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Win Amount</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Net Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {martingaleReport.history.map((row, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4 text-xs font-bold text-slate-300 italic">Week {row.week}</td>
                            <td className="px-6 py-4 text-[10px] font-black text-white uppercase">{row.opponent}</td>
                            <td className="px-6 py-4 text-xs font-bold text-blue-400">{row.quote}</td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-3 py-1 bg-white/5 rounded-lg text-xs font-black text-white border border-white/5 flex items-center justify-center gap-1 mx-auto w-fit">
                                {row.isCapped && <span className="text-amber-400 text-[10px] animate-pulse">★</span>}
                                {row.stake}€
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${row.win ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/20 text-rose-400 border border-rose-500/20'}`}>
                                {row.win ? 'WIN' : 'LOSS'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`text-xs font-black ${row.win ? 'text-emerald-400' : 'text-slate-600'}`}>
                                {row.win ? `${row.winAmount}€` : '-'}
                              </span>
                            </td>
                            <td className={`px-6 py-4 text-sm font-black text-right ${parseFloat(row.netProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {parseFloat(row.netProfit) > 0 ? '+' : ''}{row.netProfit}€
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Profit Report Modal-style card */}
            {profitReport && (
              <div className="mb-10 overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent backdrop-blur-2xl shadow-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Financial Report (100€ Bet/Game)</span>
                    <h3 className="text-3xl md:text-4xl font-black text-white mt-1 uppercase tracking-tighter">{profitTeam}</h3>
                    <div className="mt-3 flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{profitReport.winCount} WON</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">{profitReport.lossCount} LOSS</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full md:w-auto">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Stake</p>
                      <p className="text-xl font-black text-white">{profitReport.investment}€</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Return</p>
                      <p className="text-xl font-black text-white">{profitReport.returns}€</p>
                    </div>
                    <div className={`p-4 rounded-2xl border col-span-2 md:col-span-1 shadow-lg ${parseFloat(profitReport.profit) >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 shadow-emerald-500/10' : 'bg-rose-500/10 border-rose-500/30 shadow-rose-500/10'}`}>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-1 opacity-70">Net Profit/Loss</p>
                      <p className={`text-2xl font-black ${parseFloat(profitReport.profit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {parseFloat(profitReport.profit) > 0 ? '+' : ''}{profitReport.profit}€
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Analyzed {profitReport.count} Finished Matches for {profitTeam}
                  </p>
                </div>
              </div>
            )}

            {/* Matches List Grouped by Date */}
            {Object.keys(groupedMatches).length > 0 ? (
              <div className="space-y-4">
                {Object.keys(groupedMatches).map((date) => (
                  <div key={date} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md">
                    {/* Date Header */}
                    <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">{date}</h2>
                      <span className="text-[10px] font-bold text-slate-500 opacity-50">EuroLeague Fixture</span>
                    </div>

                    {/* Match Rows */}
                    <div className="divide-y divide-white/5">
                      {groupedMatches[date].map((match) => (
                        <div key={match.id} className="group hover:bg-white/[0.05] transition-colors duration-150">
                          <div className="flex items-center p-2 md:p-3 gap-3">
                            {/* Status Badge */}
                            <div className="flex-shrink-0 w-10 h-7 bg-white/5 rounded-md flex items-center justify-center border border-white/5">
                              <span className="text-[9px] font-extrabold text-slate-400">{match.status}</span>
                            </div>

                            {/* Match Info Central */}
                            <div className="flex-grow flex items-center justify-between gap-2 md:gap-6">
                              {/* Home Team */}
                              <div className="flex-1 text-right">
                                <span className={`text-xs md:text-sm font-bold tracking-tight uppercase transition-colors duration-300 ${match.homeTeam === selectedTeam ? 'text-blue-400' : 'text-slate-100'}`}>
                                  {match.homeTeam}
                                </span>
                              </div>

                              {/* Score and O/U Result */}
                              <div className="flex flex-col items-center min-w-[100px]">
                                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border transition-all duration-300 ${match.status === 'MS' ? 'bg-white/5 border-white/5' : 'bg-white/[0.02] border-white/5 border-dashed opacity-50'}`}>
                                  <span className="text-sm md:text-base font-black tracking-tighter text-white">
                                    {match.status === 'MS' ? match.scoreHome : '-'}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-600">
                                    {match.status === 'MS' ? '-' : 'v s'}
                                  </span>
                                  <span className="text-sm md:text-base font-black tracking-tighter text-white">
                                    {match.status === 'MS' ? match.scoreAway : '-'}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-col items-center space-y-1">
                                  <span className={`
                                text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border
                                ${match.result === 'Over' ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' :
                                      match.result === 'Under' ? 'text-blue-400 border-blue-500/20 bg-blue-500/5' :
                                        'text-slate-500 border-white/5 bg-white/5'}
                              `}>
                                    {match.result}
                                  </span>
                                  <span className={`
                                text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-2 
                                ${match.result === 'Over'
                                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                      : match.result === 'Under'
                                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                                        : 'bg-slate-500/20 text-slate-500 border-white/10'}
                              `}>
                                    {match.result === 'Over' ? 'WON' : (match.result === 'Under' ? 'LOSS' : match.result)}
                                  </span>
                                </div>
                              </div>

                              {/* Away Team */}
                              <div className="flex-1 text-left">
                                <span className={`text-xs md:text-sm font-bold tracking-tight uppercase transition-colors duration-300 ${match.awayTeam === selectedTeam ? 'text-blue-400' : 'text-slate-100'}`}>
                                  {match.awayTeam}
                                </span>
                              </div>
                            </div>

                            {/* Betting Info / Action Button */}
                            <div className="hidden md:flex flex-shrink-0 flex-col items-end min-w-[100px]">
                              <div className="text-[10px] space-y-1">
                                <div className="flex justify-between w-full space-x-2">
                                  <span className="text-slate-500 font-bold uppercase">Total:</span>
                                  <span className="text-white font-black">{match.status === 'MS' ? (parseInt(match.scoreHome) + parseInt(match.scoreAway)) : '-'}</span>
                                </div>
                                <div className="flex justify-between w-full space-x-2">
                                  <span className="text-slate-500 font-bold uppercase">Lmt:</span>
                                  <span className="text-amber-500 font-black">{match.limit}</span>
                                </div>
                              </div>
                            </div>

                            {/* Mackolik Style Icon Button */}
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:bg-blue-500 transition-colors cursor-pointer group-hover:scale-105 transform active:scale-95 duration-200">
                                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                                  <path d="M19,3H5C3.89,3,3,3.89,3,5v14c0,1.1,0.89,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.89,20.11,3,19,3z M19,19H5V5h14V19z M17,17h-2v-4h2V17z M13,17h-2V7h2V17z M9,17H7v-7h2V17z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 bg-white/[0.03] rounded-[40px] border-4 border-dashed border-white/5">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <span className="text-2xl">🏀</span>
                </div>
                <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">
                  No Data Found {selectedTeam ? `for ${selectedTeam}` : `for Week ${selectedWeek}`}
                </p>
                <p className="text-slate-600 text-[10px] font-bold mt-3 max-w-[200px] text-center uppercase tracking-wider">The arena is quiet. Waiting for more stats...</p>
              </div>
            )}
          </>
        ) : view === 'analytics' ? (
          <AnalyticsView matches={matches} teams={teams} />
        ) : (
          <MartingaleStatsView
            matches={matches}
            teams={teams}
            getMartingaleReport={getMartingaleReport}
          />
        )}
      </main>
    </div>
  );
};

export default App;
