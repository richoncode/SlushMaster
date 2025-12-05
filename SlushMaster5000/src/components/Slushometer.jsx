import React, { useState, useEffect } from 'react';
import { calculateSlushiness } from '../utils/slushCalculator';

export default function Slushometer() {
    const [volume, setVolume] = useState(24); // oz
    const [sugar, setSugar] = useState(50); // grams
    const [alcohol, setAlcohol] = useState(0); // oz
    const [abv, setAbv] = useState(40); // %

    const [result, setResult] = useState(null);

    useEffect(() => {
        setResult(calculateSlushiness(volume, sugar, alcohol, abv));
    }, [volume, sugar, alcohol, abv]);

    return (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-xl border border-white/20 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">❄️ Slushometer 3000</h2>

            <div className="space-y-4">
                {/* Volume Input */}
                <div>
                    <label className="block text-sm font-medium text-blue-100 mb-1">Total Liquid Volume (oz)</label>
                    <input
                        type="range" min="16" max="64" step="1"
                        value={volume} onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-full slider-thumb"
                    />
                    <div className="text-right text-white font-mono">{volume} oz</div>
                </div>

                {/* Sugar Input */}
                <div>
                    <label className="block text-sm font-medium text-blue-100 mb-1">Total Sugar (grams)</label>
                    <input
                        type="range" min="0" max="300" step="5"
                        value={sugar} onChange={(e) => setSugar(Number(e.target.value))}
                        className="w-full slider-thumb"
                    />
                    <div className="text-right text-white font-mono">{sugar}g</div>
                    <p className="text-xs text-blue-200 mt-1">Tip: A can of Coke has ~39g sugar.</p>
                </div>

                {/* Alcohol Toggle & Inputs */}
                <div className="pt-2 border-t border-white/10">
                    <label className="flex items-center space-x-2 cursor-pointer mb-2">
                        <input
                            type="checkbox"
                            checked={alcohol > 0}
                            onChange={(e) => setAlcohol(e.target.checked ? 4 : 0)}
                            className="rounded text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-white font-medium">Add Alcohol? 🍹</span>
                    </label>

                    {alcohol > 0 && (
                        <div className="pl-4 border-l-2 border-blue-400/50 space-y-3">
                            <div>
                                <label className="block text-xs text-blue-100 mb-1">Spirit Volume (oz)</label>
                                <input
                                    type="range" min="0" max={volume} step="0.5"
                                    value={alcohol} onChange={(e) => setAlcohol(Number(e.target.value))}
                                    className="w-full slider-thumb"
                                />
                                <div className="text-right text-white font-mono text-sm">{alcohol} oz</div>
                            </div>
                            <div>
                                <label className="block text-xs text-blue-100 mb-1">Spirit ABV (%)</label>
                                <input
                                    type="range" min="0" max="100" step="1"
                                    value={abv} onChange={(e) => setAbv(Number(e.target.value))}
                                    className="w-full slider-thumb"
                                />
                                <div className="text-right text-white font-mono text-sm">{abv}%</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Display */}
                {result && (
                    <div className={`mt-6 p-4 rounded-lg border ${result.color === 'green' ? 'bg-green-500/20 border-green-400/50' :
                        result.color === 'red' ? 'bg-red-500/20 border-red-400/50' :
                            'bg-yellow-500/20 border-yellow-400/50'
                        }`}>
                        <div className="text-center">
                            <div className="text-3xl mb-1">{result.color === 'green' ? '✅' : result.color === 'red' ? '🛑' : '⚠️'}</div>
                            <h3 className="text-xl font-bold text-white">{result.status}</h3>
                            <p className="text-sm text-white/90 mt-1">{result.message}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4 text-center">
                            <div className="bg-black/20 rounded p-2">
                                <div className="text-xs text-white/60">Brix (Sugar)</div>
                                <div className={`text-lg font-mono ${result.brix >= 12 && result.brix <= 18 ? 'text-green-400' : 'text-red-400'
                                    }`}>{result.brix}%</div>
                                <div className="text-[10px] text-white/40">Target: 13-15%</div>
                            </div>
                            <div className="bg-black/20 rounded p-2">
                                <div className="text-xs text-white/60">ABV (Alcohol)</div>
                                <div className={`text-lg font-mono ${result.abv <= 8 ? 'text-green-400' : 'text-red-400'
                                    }`}>{result.abv}%</div>
                                <div className="text-[10px] text-white/40">Max: ~10%</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
