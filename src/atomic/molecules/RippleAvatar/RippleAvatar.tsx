import React, { useEffect, useState } from 'react'
import OperatorSvg from '/src/assets/svg/operator.svg?react'
import styles from './RippleAvatar.module.scss'

export interface RippleAvatarProps {
    size?: number
    updateInterval?: number
}

const RippleAvatar: React.FC<RippleAvatarProps> = ({
    updateInterval = 250,
}) => {
    const [ringCount, setRingCount] = useState<number>(3)
    useEffect(() => {
        const id = setInterval(() => {
            setRingCount(Math.floor(Math.random() * 3) + 1)
        }, updateInterval)
        return () => clearInterval(id)
    }, [updateInterval])

    return (
        <div className={styles.rippleAvatar}>
            <div className={styles.rippleAvatarCenter}>
                <OperatorSvg className={styles.icon} />
            </div>
            {ringCount > 2 && <div className={styles.highSound} />}
            {ringCount > 1 && <div className={styles.midSound} />}
            {ringCount > 0 && <div className={styles.lowSound} />}
        </div>
    )
}

export default RippleAvatar
