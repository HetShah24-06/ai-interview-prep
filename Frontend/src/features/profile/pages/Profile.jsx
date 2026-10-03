import React, { useState, useEffect, useRef } from 'react'
import {
    getProfile, uploadResume, deleteResume, downloadResume,
    updateEmail, updatePassword,
} from '../services/profile.api'
import '../profile.scss'

const Profile = () => {
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)
    const [message, setMessage] = useState(null)
    const fileInputRef = useRef()

    const [showEmailForm, setShowEmailForm] = useState(false)
    const [newEmail, setNewEmail] = useState('')
    const [emailPassword, setEmailPassword] = useState('')
    const [emailBusy, setEmailBusy] = useState(false)
    const [emailError, setEmailError] = useState(null)
    const [emailMessage, setEmailMessage] = useState(null)

    const [showPasswordForm, setShowPasswordForm] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [passwordBusy, setPasswordBusy] = useState(false)
    const [passwordError, setPasswordError] = useState(null)
    const [passwordMessage, setPasswordMessage] = useState(null)

    const loadProfile = async () => {
        try {
            const data = await getProfile()
            setProfile(data.user)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadProfile() }, [])

    const handleFileSelected = async (e) => {
        const file = e.target.files[ 0 ]
        e.target.value = ''
        if (!file) return

        setBusy(true)
        setError(null)
        setMessage(null)
        try {
            await uploadResume(file)
            setMessage('Resume saved to your profile.')
            await loadProfile()
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    const handleDelete = async () => {
        setBusy(true)
        setError(null)
        setMessage(null)
        try {
            await deleteResume()
            setMessage('Saved resume removed.')
            await loadProfile()
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    const handleDownload = async () => {
        setError(null)
        try {
            const blob = await downloadResume()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', profile?.resume?.fileName || 'resume.pdf')
            document.body.appendChild(link)
            link.click()
            link.remove()
            setTimeout(() => window.URL.revokeObjectURL(url), 1000)
        } catch (err) {
            setError(err.message)
        }
    }

    const handleUpdateEmail = async (e) => {
        e.preventDefault()
        setEmailBusy(true)
        setEmailError(null)
        setEmailMessage(null)
        try {
            await updateEmail({ newEmail, currentPassword: emailPassword })
            setEmailMessage('Email updated.')
            setNewEmail('')
            setEmailPassword('')
            setShowEmailForm(false)
            await loadProfile()
        } catch (err) {
            setEmailError(err.message)
        } finally {
            setEmailBusy(false)
        }
    }

    const handleUpdatePassword = async (e) => {
        e.preventDefault()
        setPasswordBusy(true)
        setPasswordError(null)
        setPasswordMessage(null)
        try {
            await updatePassword({ currentPassword, newPassword })
            setPasswordMessage('Password updated.')
            setCurrentPassword('')
            setNewPassword('')
            setShowPasswordForm(false)
        } catch (err) {
            setPasswordError(err.message)
        } finally {
            setPasswordBusy(false)
        }
    }

    if (loading) {
        return (
            <main className='profile-page'>
                <h1>Loading profile...</h1>
            </main>
        )
    }

    return (
        <main className='profile-page'>
            <div className='profile-card'>
                <h1>Your Profile</h1>

                <div className='profile-field'>
                    <span className='profile-field__label'>Username</span>
                    <span className='profile-field__value'>{profile.username}</span>
                </div>

                <div className='profile-field'>
                    <span className='profile-field__label'>Email</span>
                    <div className='profile-field__value-group'>
                        <span className='profile-field__value'>{profile.email}</span>
                        <button
                            className='profile-field__action'
                            onClick={() => { setShowEmailForm((s) => !s); setEmailError(null); setEmailMessage(null) }}
                        >
                            Change
                        </button>
                    </div>
                </div>
                {emailMessage && <p className='profile-success'>{emailMessage}</p>}
                {showEmailForm && (
                    <form className='inline-form' onSubmit={handleUpdateEmail}>
                        {emailError && <p className='profile-error' role='alert'>{emailError}</p>}
                        <input
                            type='email'
                            placeholder='New email address'
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            required
                        />
                        <input
                            type='password'
                            placeholder='Current password'
                            value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)}
                            required
                        />
                        <button type='submit' disabled={emailBusy} className='button primary-button'>
                            {emailBusy ? 'Saving...' : 'Save Email'}
                        </button>
                    </form>
                )}

                <div className='profile-field'>
                    <span className='profile-field__label'>Password</span>
                    <div className='profile-field__value-group'>
                        <span className='profile-field__value'>••••••••</span>
                        <button
                            className='profile-field__action'
                            onClick={() => { setShowPasswordForm((s) => !s); setPasswordError(null); setPasswordMessage(null) }}
                        >
                            Change
                        </button>
                    </div>
                </div>
                {passwordMessage && <p className='profile-success'>{passwordMessage}</p>}
                {showPasswordForm && (
                    <form className='inline-form' onSubmit={handleUpdatePassword}>
                        {passwordError && <p className='profile-error' role='alert'>{passwordError}</p>}
                        <input
                            type='password'
                            placeholder='Current password'
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                        <input
                            type='password'
                            placeholder='New password (min 6 characters)'
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <button type='submit' disabled={passwordBusy} className='button primary-button'>
                            {passwordBusy ? 'Saving...' : 'Save Password'}
                        </button>
                    </form>
                )}

                <div className='profile-divider' />

                <h2>Saved Resume</h2>
                <p className='profile-hint'>
                    Save a base resume here once, and every new interview plan can reuse it
                    automatically without re-uploading it each time.
                </p>

                {error && <p className='profile-error' role='alert'>{error}</p>}
                {message && <p className='profile-success'>{message}</p>}

                {profile.resume ? (
                    <div className='resume-card'>
                        <div className='resume-card__info'>
                            <span className='resume-card__name'>{profile.resume.fileName}</span>
                            <span className='resume-card__date'>
                                Saved on {new Date(profile.resume.updatedAt).toLocaleDateString()}
                            </span>
                        </div>
                        <div className='resume-card__actions'>
                            <button onClick={handleDownload} disabled={busy} className='button'>Download</button>
                            <button onClick={() => fileInputRef.current.click()} disabled={busy} className='button'>Replace</button>
                            <button onClick={handleDelete} disabled={busy} className='button button--danger'>Remove</button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => fileInputRef.current.click()}
                        disabled={busy}
                        className='button primary-button'
                    >
                        {busy ? 'Uploading...' : 'Upload Resume (PDF)'}
                    </button>
                )}

                <input
                    ref={fileInputRef}
                    onChange={handleFileSelected}
                    hidden
                    type='file'
                    accept='application/pdf,.pdf'
                />
            </div>
        </main>
    )
}

export default Profile
