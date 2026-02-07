import React from 'react';

const StrategyLanding = ({ onSelect }) => {
    return (
        <div className="min-h-screen bg-[#0b0f1a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />

            <div className="relative z-10 max-w-4xl w-full text-center">
                <div className="flex items-center justify-center space-x-4 mb-8 animate-in fade-in zoom-in duration-700">
                    <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-xl">
                        <span className="text-3xl">🏀</span>
                    </div>
                    <div className="text-left">
                        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">EuroLeague</h1>
                        <p className="text-xs font-black text-blue-400 uppercase tracking-[0.4em] mt-2">Advanced Analytics Hub</p>
                    </div>
                </div>

                <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-tight mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                    Select Your <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-indigo-500">Winning Strategy</span>
                </h2>

                <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-2xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    Choose between high-precision Over/Under models. Our algorithms dynamically track match lines,
                    historical performance, and Martingale progressions for every team.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                    {/* Over Strategy Card */}
                    <button
                        onClick={() => onSelect('over')}
                        className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-2xl p-10 text-left transition-all duration-500 hover:scale-[1.02] hover:border-emerald-500/50 hover:bg-emerald-500/5 shadow-2xl"
                    >
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/20 mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <span className="text-2xl text-emerald-400">📈</span>
                                </div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-4 group-hover:text-emerald-400 transition-colors">Over Strategy</h3>
                                <p className="text-slate-400 font-medium leading-relaxed mb-8">
                                    Analyzes teams trending towards offensive outbursts. Optimized for games exceeding the points line.
                                </p>
                            </div>
                            <div className="flex items-center text-emerald-400 font-black text-xs uppercase tracking-widest gap-2">
                                Launch Dashboard
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </div>
                        </div>
                        <div className="absolute right-[-20%] bottom-[-20%] w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </button>

                    {/* Under Strategy Card */}
                    <button
                        onClick={() => onSelect('under')}
                        className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-2xl p-10 text-left transition-all duration-500 hover:scale-[1.02] hover:border-blue-500/50 hover:bg-blue-500/5 shadow-2xl"
                    >
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/20 mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <span className="text-2xl text-blue-400">📉</span>
                                </div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-4 group-hover:text-blue-400 transition-colors">Under Strategy</h3>
                                <p className="text-slate-400 font-medium leading-relaxed mb-8">
                                    Focuses on defensive masters and low-pace matchups. Target profits on scores staying below the line.
                                </p>
                            </div>
                            <div className="flex items-center text-blue-400 font-black text-xs uppercase tracking-widest gap-2">
                                Launch Dashboard
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </div>
                        </div>
                        <div className="absolute right-[-20%] bottom-[-20%] w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StrategyLanding;
