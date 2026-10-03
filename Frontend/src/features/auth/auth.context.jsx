import { createContext, useState, useEffect } from "react";
import { getMe } from "./services/auth.api";
import { setCsrfToken } from "../../lib/api";

export const AuthContext = createContext()


export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    /* restore the session once, here rather than in useAuth, so that every
       component calling the hook does not fire its own /get-me request */
    useEffect(() => {
        getMe()
            .then((data) => { setUser(data.user); setCsrfToken(data.csrfToken) })
            .catch(() => setUser(null))
            .finally(() => setLoading(false))
    }, [])

    return (
        <AuthContext.Provider value={{user,setUser,loading,setLoading,error,setError}} >
            {children}
        </AuthContext.Provider>
    )


}
