import React from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import './navbar.scss'

const Navbar = () => {
    const { user, handleLogout } = useAuth()
    const navigate = useNavigate()

    const onLogout = async () => {
        await handleLogout()
        navigate('/login')
    }

    return (
        <header className='navbar'>
            <Link to='/' className='navbar__brand'>Interview Master</Link>
            <div className='navbar__actions'>
                {user && <span className='navbar__user'>{user.username}</span>}
                <button onClick={onLogout} className='button primary-button navbar__logout'>Logout</button>
            </div>
        </header>
    )
}

export default Navbar
