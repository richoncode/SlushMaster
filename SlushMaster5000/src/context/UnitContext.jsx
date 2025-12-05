import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { UNITS } from '../utils/converters';

const UnitContext = createContext();

export const useUnit = () => useContext(UnitContext);

export const UnitProvider = ({ children }) => {
    const [unit, setUnit] = useState(UNITS.OZ);
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);

    // Load preference on mount or user change
    useEffect(() => {
        const loadPreference = async () => {
            // 1. Try local storage first for immediate feedback
            const localPref = localStorage.getItem('slushmaster_unit_pref');
            if (localPref && Object.values(UNITS).includes(localPref)) {
                setUnit(localPref);
            }

            // 2. If logged in, fetch from Firestore
            if (currentUser) {
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists() && userDoc.data().unitPreference) {
                        setUnit(userDoc.data().unitPreference);
                        // Update local storage to match cloud
                        localStorage.setItem('slushmaster_unit_pref', userDoc.data().unitPreference);
                    }
                } catch (error) {
                    console.error("Error fetching unit preference:", error);
                }
            }
            setLoading(false);
        };

        loadPreference();
    }, [currentUser]);

    const changeUnit = async (newUnit) => {
        setUnit(newUnit);
        localStorage.setItem('slushmaster_unit_pref', newUnit);

        if (currentUser) {
            try {
                const userDocRef = doc(db, 'users', currentUser.uid);
                await setDoc(userDocRef, { unitPreference: newUnit }, { merge: true });
            } catch (error) {
                console.error("Error saving unit preference:", error);
            }
        }
    };

    return (
        <UnitContext.Provider value={{ unit, changeUnit, UNITS }}>
            {children}
        </UnitContext.Provider>
    );
};
