import React, { useEffect, useState } from 'react'
import OperatorSvg from '/src/assets/svg/operator.svg?react'
import styles from './RippleAvatar.module.scss'

export interface RippleAvatarProps {
    size?: number
    updateInterval?: number
    isActive?: boolean 
}

const RippleAvatar: React.FC<RippleAvatarProps> = ({
    updateInterval = 250,
    isActive = false, 
}) => {
    const [ringCount, setRingCount] = useState<number>(3)
    
    useEffect(() => {
        const id = setInterval(() => {
            setRingCount(isActive ? Math.floor(Math.random() * 3) + 1 : 0)
        }, updateInterval)
        return () => clearInterval(id)
    }, [updateInterval, isActive])

    return (
        <div className={`${styles.rippleAvatar} ${isActive ? styles.active : ''}`}>
            <div className={styles.rippleAvatarCenter}>
                <OperatorSvg className={styles.icon} />
            </div>
            {isActive && (
                <>
                    {ringCount > 2 && <div className={styles.highSound} />}
                    {ringCount > 1 && <div className={styles.midSound} />}
                    {ringCount > 0 && <div className={styles.lowSound} />}
                </>
            )}
        </div>
    )
}

export default RippleAvatar
