import React from 'react';
import { useUnit } from '../context/UnitContext';

const UnitSelector = () => {
    const { unit, changeUnit, UNITS } = useUnit();

    const options = [
        { value: UNITS.ORIGINAL, label: '📝 Original' },
        { value: UNITS.OZ, label: '🇺🇸 Ounces' },
        { value: UNITS.ML, label: '🔬 Milliliters' },
        { value: UNITS.CUPS, label: '🥣 Cups' },
    ];

    return (
        <div className="relative group z-50">
            <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white/80 transition border border-white/10 flex items-center gap-2">
                <span>📏</span>
                <span className="hidden sm:inline">Units:</span>
                <span className="text-blue-300">{options.find(o => o.value === unit)?.label}</span>
            </button>

            <div className="absolute right-0 top-full pt-2 w-40 hidden group-hover:block">
                <div className="bg-gray-900 rounded-lg shadow-xl border border-white/20 py-1">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => changeUnit(option.value)}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition flex items-center gap-2 ${unit === option.value ? 'text-blue-400 font-bold' : 'text-white/70'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UnitSelector;
