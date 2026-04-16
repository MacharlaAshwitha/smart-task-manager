import Team from '../models/Team.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { logActivity } from '../utils/activity.js';

function isTeamMember(team, userId) {
  return team.members.some((m) => m.userId.toString() === userId.toString());
}

function isOwnerOrAdmin(team, userId) {
  const m = team.members.find((x) => x.userId.toString() === userId.toString());
  return m && (m.role === 'owner' || m.role === 'admin');
}

export async function createTeam(req, res) {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Team name is required' });
    }
    const team = await Team.create({
      name: name.trim(),
      description: description ?? '',
      createdBy: req.user._id,
      members: [{ userId: req.user._id, role: 'owner', joinedAt: new Date() }],
    });
    await logActivity({
      actorId: req.user._id,
      teamId: team._id,
      action: 'team_created',
      details: `Created team "${team.name}"`,
    });
    res.status(201).json({ team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create team' });
  }
}

export async function listTeams(req, res) {
  try {
    const teams = await Team.find({ 'members.userId': req.user._id })
      .populate('members.userId', 'name email')
      .sort({ updatedAt: -1 });
    res.json({ teams });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to list teams' });
  }
}

export async function getTeam(req, res) {
  try {
    const team = await Team.findById(req.params.id).populate('members.userId', 'name email');
    if (!team || !isTeamMember(team, req.user._id)) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json({ team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get team' });
  }
}

/** Invite by email (user must register/login with that email to accept). */
export async function inviteToTeam(req, res) {
  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const normalized = email.toLowerCase().trim();
    const team = await Team.findById(req.params.id);
    if (!team || !isOwnerOrAdmin(team, req.user._id)) {
      return res.status(403).json({ message: 'Not allowed to invite' });
    }
    const alreadyMember = await User.findOne({ email: normalized });
    if (alreadyMember && isTeamMember(team, alreadyMember._id)) {
      return res.status(409).json({ message: 'User is already a member' });
    }
    if (team.pendingInvites.some((p) => p.email === normalized)) {
      return res.status(409).json({ message: 'Invite already pending' });
    }
    team.pendingInvites.push({ email: normalized, invitedBy: req.user._id });
    await team.save();

    await logActivity({
      actorId: req.user._id,
      teamId: team._id,
      action: 'member_invited',
      details: `Invited ${normalized}`,
    });

    if (alreadyMember) {
      await Notification.create({
        userId: alreadyMember._id,
        type: 'invite',
        title: 'Team invitation',
        message: `You were invited to join "${team.name}"`,
      });
    }

    res.json({ team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send invite' });
  }
}

/** Accept pending invite for current user's email. */
export async function acceptInvite(req, res) {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    const email = req.user.email.toLowerCase();
    const idx = team.pendingInvites.findIndex((p) => p.email === email);
    if (idx === -1) {
      return res.status(400).json({ message: 'No pending invite for your account' });
    }
    if (isTeamMember(team, req.user._id)) {
      team.pendingInvites.splice(idx, 1);
      await team.save();
      return res.json({ team, message: 'Already a member' });
    }
    team.pendingInvites.splice(idx, 1);
    team.members.push({ userId: req.user._id, role: 'member', joinedAt: new Date() });
    await team.save();

    await logActivity({
      actorId: req.user._id,
      teamId: team._id,
      action: 'member_joined',
      details: `${req.user.name} joined the team`,
    });

    res.json({ team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to accept invite' });
  }
}

export async function listPendingInvites(req, res) {
  try {
    const email = req.user.email.toLowerCase();
    const teams = await Team.find({ 'pendingInvites.email': email });
    res.json({
      invites: teams.map((t) => ({
        teamId: t._id,
        name: t.name,
        invitedAt: t.pendingInvites.find((p) => p.email === email)?.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to list invites' });
  }
}
